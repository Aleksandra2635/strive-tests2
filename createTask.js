const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function createTask() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const TASK_NAME = 'Тестовая задача';

  console.log('🚀 Запуск теста создания задачи...');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`📋 Название задачи: ${TASK_NAME}`);

  const browserOptions = getBrowserOptions();

  console.log(
    `🖥️ Режим браузера: ${browserOptions.headless ? 'headless' : 'видимый'}`
  );

  if (!browserOptions.headless) {
    browserOptions.slowMo = 700;
    console.log('🐢 Визуальный режим: slowMo = 700 мс');
  }

  const browser = await chromium.launch(browserOptions);

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: {
      width: 1920,
      height: 1080
    }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  const visualPause = async (ms = 1000) => {
    if (!browserOptions.headless) {
      await page.waitForTimeout(ms);
    }
  };

  const responses = [];

  page.on('response', response => {
    const url = response.url();
    const method = response.request().method();
    const status = response.status();

    if (url.includes('/tasks') && method === 'POST') {
      responses.push({
        url,
        method,
        status,
        timestamp: new Date()
      });

      console.log(
        `📡 Перехвачен ответ: ${method} ${url} → ${status}`
      );
    }
  });

  try {
    // 1️⃣ Вход
    console.log('\n🌐 Открытие страницы входа...');

    await page.goto('https://app.striveapp.ru/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.locator('[name="email"]').waitFor({
      state: 'visible',
      timeout: 30000
    });

    await visualPause(1000);

    console.log('📝 Ввод email...');
    await page.fill('[name="email"]', USER_EMAIL);

    await visualPause(500);

    console.log('📝 Ввод пароля...');
    await page.fill('[name="password"]', USER_PASSWORD);

    await visualPause(1000);

    console.log('🖱️ Нажатие кнопки "Продолжить"...');

    await page
      .locator('button[type="submit"]')
      .click();

    console.log('⏳ Ожидание успешного входа...');

    await page.waitForURL(
      /\/main|\/dashboard|\/workspace/,
      {
        timeout: 45000
      }
    );

    console.log('✅ Вход выполнен!');
    console.log(`🏠 Текущий URL: ${page.url()}`);

    await visualPause(1500);

    // 2️⃣ Поиск пространства
    console.log('\n📁 Поиск пространства...');

    const spaceLinks = page.locator(
      'a[href*="/spaces/"]'
    );

    await spaceLinks.first().waitFor({
      state: 'visible',
      timeout: 20000
    });

    const spaceCount = await spaceLinks.count();

    console.log(
      `🔎 Найдено ссылок, содержащих /spaces/: ${spaceCount}`
    );

    let projectsHref = null;
    let boardHref = null;

    for (let i = 0; i < spaceCount; i++) {
      const href =
        await spaceLinks
          .nth(i)
          .getAttribute('href');

      if (!href) {
        continue;
      }

      console.log(`   🔗 ${href}`);

      if (
        /\/spaces\/[^/]+\/projects\/?$/.test(href) &&
        !projectsHref
      ) {
        projectsHref = href;
      }

      if (
        href.includes('/tasks') &&
        !boardHref
      ) {
        boardHref = href;
      }
    }

    await visualPause(1000);

    // 3️⃣ Переход в проект
    if (boardHref) {
      console.log(
        '\n📂 Найдена прямая ссылка на доску проекта'
      );

      console.log(`🔗 ${boardHref}`);

      await visualPause(1000);

      await page.goto(
        new URL(
          boardHref,
          'https://app.striveapp.ru'
        ).href,
        {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        }
      );

    } else if (projectsHref) {
      console.log(
        '\n📁 Переход к списку проектов...'
      );

      console.log(`🔗 ${projectsHref}`);

      await page.goto(
        new URL(
          projectsHref,
          'https://app.striveapp.ru'
        ).href,
        {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        }
      );

      console.log(
        `📍 URL пространства: ${page.url()}`
      );

      await visualPause(1500);

      console.log('\n📂 Поиск проекта...');

      const projectLinks = page.locator(
        'a[href*="/spaces/"][href*="/tasks"]'
      );

      await projectLinks.first().waitFor({
        state: 'visible',
        timeout: 20000
      });

      const projectHref =
        await projectLinks
          .first()
          .getAttribute('href');

      if (!projectHref) {
        throw new Error(
          'Не удалось получить ссылку на проект'
        );
      }

      console.log(
        `🔗 Найдена доска проекта: ${projectHref}`
      );

      await visualPause(1000);

      await page.goto(
        new URL(
          projectHref,
          'https://app.striveapp.ru'
        ).href,
        {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        }
      );

    } else {
      throw new Error(
        'Не удалось найти пространство или проект'
      );
    }

    console.log('✅ Доска проекта открыта');
    console.log(`📍 URL проекта: ${page.url()}`);

    await visualPause(1500);

    // 4️⃣ Ждём реальную загрузку доски
    console.log(
      '\n⏳ Ожидание полной загрузки доски...'
    );

    const BOARD_LOAD_TIMEOUT = 30000;
    const CHECK_INTERVAL = 500;
    const startTime = Date.now();

    let addTask = null;

    while (
      Date.now() - startTime <
      BOARD_LOAD_TIMEOUT
    ) {
      const candidates = page.getByText(
        'Добавить задачу',
        {
          exact: true
        }
      );

      const count = await candidates.count();

      for (let i = 0; i < count; i++) {
        const candidate =
          candidates.nth(i);

        if (await candidate.isVisible()) {
          addTask = candidate;
          break;
        }
      }

      if (addTask) {
        break;
      }

      await page.waitForTimeout(
        CHECK_INTERVAL
      );
    }

    if (!addTask) {
      throw new Error(
        'Доска не загрузилась: "Добавить задачу" не стала видимой'
      );
    }

    console.log(
      '✅ Доска полностью загрузилась'
    );

    await visualPause(1500);

    // 5️⃣ Добавление задачи
    console.log(
      '\n➕ Нажатие на "Добавить задачу"...'
    );

    await addTask.click();

    console.log(
      '✅ Клик по "Добавить задачу" выполнен'
    );

    await visualPause(1500);

    // 6️⃣ Ввод названия
    console.log(
      '\n📝 Ввод названия задачи...'
    );

    let taskInput = page.locator(
      'textarea[type="text"]:visible'
    );

    if (
      (await taskInput.count()) === 0
    ) {
      taskInput = page
        .locator('textarea:visible')
        .first();
    }

    await taskInput.waitFor({
      state: 'visible',
      timeout: 10000
    });

    console.log(
      '✅ Поле названия задачи найдено'
    );

    await visualPause(1000);

    console.log(
      `⌨️ Ввод названия: "${TASK_NAME}"`
    );

    await taskInput.fill(TASK_NAME);

    console.log(
      `✅ Введено название: ${TASK_NAME}`
    );

    await visualPause(1500);

    // 7️⃣ Сохранение задачи
    console.log(
      '\n💾 Сохранение задачи клавишей Enter...'
    );

    let taskResponse = null;

    await visualPause(1000);

    try {
      [taskResponse] = await Promise.all([
        page.waitForResponse(
          response => {
            const url = response.url();
            const method =
              response
                .request()
                .method();

            return (
              method === 'POST' &&
              url.includes('/tasks')
            );
          },
          {
            timeout: 15000
          }
        ),

        taskInput.press('Enter')
      ]);

      console.log('✅ Enter нажат');

    } catch (err) {
      console.warn(
        '⚠️ После Enter POST не получен, пробуем потерю фокуса...'
      );

      const responsePromise =
        page.waitForResponse(
          response => {
            const url = response.url();
            const method =
              response
                .request()
                .method();

            return (
              method === 'POST' &&
              url.includes('/tasks')
            );
          },
          {
            timeout: 15000
          }
        );

      await visualPause(1000);

      console.log(
        '🖱️ Клик вне поля задачи...'
      );

      await page
        .locator('body')
        .click({
          position: {
            x: 100,
            y: 100
          }
        });

      taskResponse =
        await responsePromise;

      console.log(
        '✅ POST получен после потери фокуса'
      );
    }

    await visualPause(1500);

    // 8️⃣ Проверка ответа API
    if (taskResponse) {
      const status =
        taskResponse.status();

      const apiUrl =
        taskResponse.url();

      console.log(
        '\n🔍 Проверка ответа сервера...'
      );

      console.log(
        `📡 URL API: ${apiUrl}`
      );

      console.log(
        `📊 HTTP статус: ${status}`
      );

      if (
        status >= 200 &&
        status < 300
      ) {
        console.log(
          '✅ Сервер успешно создал задачу'
        );
      } else {
        throw new Error(
          `Сервер вернул HTTP ${status} при создании задачи`
        );
      }
    }

    // 9️⃣ Ожидание возможного перехода на задачу
    console.log(
      '\n⏳ Проверка URL после создания...'
    );

    try {
      await page.waitForURL(
        url =>
          url.pathname.includes('/spaces/') &&
          url.pathname.includes('/tasks/'),
        {
          timeout: 10000
        }
      );

      console.log(
        '✅ Выполнен переход на страницу задачи'
      );

      console.log(
        `📍 URL: ${page.url()}`
      );

    } catch (err) {
      console.log(
        'ℹ️ Отдельного перехода на страницу задачи не произошло'
      );

      console.log(
        `📍 Текущий URL: ${page.url()}`
      );
    }

    await visualPause(1500);

    // 🔟 Проверка задачи в интерфейсе
    console.log(
      '\n🔎 Проверка созданной задачи на странице...'
    );

    const createdTask =
      page.getByText(
        TASK_NAME,
        {
          exact: true
        }
      );

    await createdTask
      .first()
      .waitFor({
        state: 'visible',
        timeout: 15000
      });

    console.log(
      `✅ Задача "${TASK_NAME}" отображается на странице`
    );

    await visualPause(2000);

    // 1️⃣1️⃣ Проверка перехваченных POST
    console.log(
      '\n🔍 Проверка перехваченных POST-запросов...'
    );

    const postResponse =
      responses.find(
        r =>
          r.method === 'POST' &&
          r.url.includes('/tasks')
      );

    if (postResponse) {
      console.log(
        '✅ POST запрос на создание задачи был перехвачен'
      );

      console.log(
        `📡 URL: ${postResponse.url}`
      );

      console.log(
        `📊 Статус: ${postResponse.status}`
      );
    } else {
      console.warn(
        '⚠️ POST запрос отсутствует в массиве responses'
      );
    }

    // Финальное состояние оставляем на экране
    await visualPause(3000);

    // 1️⃣2️⃣ Скриншот
    await page.screenshot({
      path: 'task-created.png',
      fullPage: false
    });

    console.log(
      '📸 Скриншот сохранён: task-created.png'
    );

    console.log(
      '\n✨ Задача успешно создана!'
    );

  } catch (error) {
    console.error(
      '\n❌ Ошибка при создании задачи:',
      error.message
    );

    console.error(
      `📍 URL в момент ошибки: ${page.url()}`
    );

    // Даём глазами посмотреть на экран,
    // на котором произошла ошибка
    await visualPause(3000);

    try {
      await page.screenshot({
        path: 'task-error.png',
        fullPage: true
      });

      console.log(
        '📸 Скриншот ошибки сохранён: task-error.png'
      );

    } catch (e) {
      console.warn(
        '⚠️ Не удалось сохранить скриншот'
      );
    }

    try {
      const html =
        await page.content();

      require('fs').writeFileSync(
        'task-error.html',
        html
      );

      console.log(
        '📄 HTML страницы сохранён: task-error.html'
      );

    } catch (e) {
      console.warn(
        '⚠️ Не удалось сохранить HTML'
      );
    }

    throw error;

  } finally {
    await browser.close();

    console.log(
      '\nℹ️ Браузер закрыт'
    );
  }
}

createTask()
  .then(() => {
    console.log(
      '\n✨ Тест создания задачи завершён успешно'
    );
  })
  .catch(error => {
    console.error(
      '\n💥 Тест завершился с ошибкой:',
      error.message
    );

    process.exit(1);
  });