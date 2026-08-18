const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function completeTask() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const TASK_NAME = 'Тестовая задача — завершение';

  console.log('🚀 Запуск теста завершения задачи...');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`📝 Задача: ${TASK_NAME}`);

  const browserOptions = getBrowserOptions();

  console.log(
    `🖥️ Режим браузера: ${browserOptions.headless ? 'headless' : 'видимый'}`
  );

  // В видимом режиме замедляем действия Playwright.
  // В CI headless=true, поэтому slowMo там не используется.
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
  page.setDefaultNavigationTimeout(90000);

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

    if (
      method === 'PATCH' &&
      url.includes('/tasks/') &&
      url.includes('/change-task-status')
    ) {
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
    // ============================================================
    // 1. АВТОРИЗАЦИЯ
    // ============================================================

    console.log('\n🌐 Открытие страницы входа...');

    await page.goto(
      'https://app.striveapp.ru/login',
      {
        waitUntil: 'commit',
        timeout: 90000
      }
    );

    console.log(
      '⏳ Ожидание формы входа...'
    );

    await page.locator('[name="email"]').waitFor({
      state: 'visible',
      timeout: 60000
    });

    console.log(
      '✅ Страница входа готова'
    );

    await visualPause(1000);

    console.log('📝 Ввод email...');

    await page.fill(
      '[name="email"]',
      USER_EMAIL
    );

    await visualPause(500);

    console.log('📝 Ввод пароля...');

    await page.fill(
      '[name="password"]',
      USER_PASSWORD
    );

    await visualPause(1000);

    console.log(
      '🖱️ Нажатие кнопки "Продолжить"...'
    );

    await page
      .locator('button[type="submit"]')
      .click();

    console.log(
      '⏳ Ожидание успешного входа...'
    );

    await page.waitForURL(
      /\/main|\/dashboard|\/workspace/,
      {
        timeout: 60000
      }
    );

    console.log(
      '✅ Вход выполнен!'
    );

    console.log(
      `🏠 Текущий URL: ${page.url()}`
    );

    await visualPause(1500);

    // ============================================================
    // 2. ПОИСК ПРОСТРАНСТВА / ПРОЕКТА
    // ============================================================

    console.log(
      '\n📁 Поиск пространства...'
    );

    const spaceLinks = page.locator(
      'a[href*="/spaces/"]'
    );

    await spaceLinks
      .first()
      .waitFor({
        state: 'visible',
        timeout: 60000
      });

    const spaceCount =
      await spaceLinks.count();

    console.log(
      `🔎 Найдено ссылок, содержащих /spaces/: ${spaceCount}`
    );

    let projectsHref = null;
    let boardHref = null;

    for (
      let i = 0;
      i < spaceCount;
      i++
    ) {
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

    // ============================================================
    // 3. ПЕРЕХОД НА ДОСКУ
    // ============================================================

    if (boardHref) {
      console.log(
        '\n📂 Найдена прямая ссылка на доску проекта'
      );

      console.log(
        `🔗 ${boardHref}`
      );

      await page.goto(
        new URL(
          boardHref,
          'https://app.striveapp.ru'
        ).href,
        {
          waitUntil: 'commit',
          timeout: 90000
        }
      );

    } else if (projectsHref) {
      console.log(
        '\n📁 Переход к списку проектов...'
      );

      console.log(
        `🔗 ${projectsHref}`
      );

      await page.goto(
        new URL(
          projectsHref,
          'https://app.striveapp.ru'
        ).href,
        {
          waitUntil: 'commit',
          timeout: 90000
        }
      );

      console.log(
        `📍 URL пространства: ${page.url()}`
      );

      await visualPause(1500);

      console.log(
        '\n📂 Поиск проекта...'
      );

      const projectLinks =
        page.locator(
          'a[href*="/spaces/"][href*="/tasks"]'
        );

      await projectLinks
        .first()
        .waitFor({
          state: 'visible',
          timeout: 60000
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

      console.log(
        '🌐 Переход на доску проекта...'
      );

      await page.goto(
        new URL(
          projectHref,
          'https://app.striveapp.ru'
        ).href,
        {
          waitUntil: 'commit',
          timeout: 90000
        }
      );

    } else {
      throw new Error(
        'Не удалось найти пространство или проект'
      );
    }

    console.log(
      '✅ Переход на URL доски выполнен'
    );

    console.log(
      `📍 URL проекта: ${page.url()}`
    );

    await visualPause(1500);

    // ============================================================
    // 4. ОЖИДАНИЕ РЕАЛЬНОЙ ЗАГРУЗКИ ДОСКИ
    // ============================================================

    console.log(
      '\n⏳ Ожидание полной загрузки доски...'
    );

    const BOARD_LOAD_TIMEOUT = 60000;
    const CHECK_INTERVAL = 500;
    const startTime = Date.now();

    let addTask = null;

    while (
      Date.now() - startTime <
      BOARD_LOAD_TIMEOUT
    ) {
      const candidates =
        page.getByText(
          'Добавить задачу',
          {
            exact: true
          }
        );

      const count =
        await candidates.count();

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const candidate =
          candidates.nth(i);

        if (
          await candidate
            .isVisible()
            .catch(() => false)
        ) {
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
        'Доска не загрузилась за 60 секунд: "Добавить задачу" не стала видимой'
      );
    }

    console.log(
      '✅ Доска полностью загрузилась'
    );

    await visualPause(1500);

    // ============================================================
    // 5. СОЗДАНИЕ ЗАДАЧИ ДЛЯ ЗАВЕРШЕНИЯ
    // ============================================================

    console.log(
      '\n➕ Создание задачи для завершения...'
    );

    await addTask.click();

    console.log(
      '✅ Клик по "Добавить задачу" выполнен'
    );

    await visualPause(1500);

    let taskInput =
      page.locator(
        'textarea[type="text"]:visible'
      );

    if (
      (await taskInput.count()) === 0
    ) {
      taskInput =
        page
          .locator('textarea:visible')
          .first();
    }

    await taskInput.waitFor({
      state: 'visible',
      timeout: 30000
    });

    console.log(
      '✅ Поле названия задачи найдено'
    );

    await visualPause(1000);

    console.log(
      `⌨️ Ввод названия: "${TASK_NAME}"`
    );

    await taskInput.fill(
      TASK_NAME
    );

    console.log(
      `✅ Введено название: ${TASK_NAME}`
    );

    await visualPause(1500);

    // ============================================================
    // 6. СОХРАНЕНИЕ ЗАДАЧИ
    // ============================================================

    console.log(
      '\n💾 Сохранение созданной задачи...'
    );

    let createTaskResponse = null;

    try {
      [createTaskResponse] =
        await Promise.all([
          page.waitForResponse(
            response => {
              const url =
                response.url();

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
              timeout: 30000
            }
          ),

          taskInput.press('Enter')
        ]);

      console.log(
        '✅ Задача сохранена через Enter'
      );

    } catch (err) {
      console.warn(
        '⚠️ После Enter POST не получен, пробуем blur'
      );

      const responsePromise =
        page.waitForResponse(
          response => {
            const url =
              response.url();

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
            timeout: 30000
          }
        );

      await page
        .locator('body')
        .click({
          position: {
            x: 100,
            y: 100
          }
        });

      createTaskResponse =
        await responsePromise;

      console.log(
        '✅ Задача сохранена после потери фокуса'
      );
    }

    const createStatus =
      createTaskResponse.status();

    console.log(
      `📊 Статус создания задачи: ${createStatus}`
    );

    if (
      createStatus < 200 ||
      createStatus >= 300
    ) {
      throw new Error(
        `Сервер вернул HTTP ${createStatus} при создании задачи`
      );
    }

    console.log(
      '✅ Задача для завершения создана'
    );

    await visualPause(2000);

    // ============================================================
    // 7. ПОИСК СОЗДАННОЙ ЗАДАЧИ
    // ============================================================

    console.log(
      `\n🔎 Поиск созданной задачи "${TASK_NAME}"...`
    );

    const createdTask =
      page.getByText(
        TASK_NAME,
        {
          exact: true
        }
      );

    let taskElement = null;
    const taskSearchStart =
      Date.now();

    while (
      Date.now() - taskSearchStart <
      30000
    ) {
      const taskCount =
        await createdTask.count();

      for (
        let i = 0;
        i < taskCount;
        i++
      ) {
        const candidate =
          createdTask.nth(i);

        if (
          await candidate
            .isVisible()
            .catch(() => false)
        ) {
          taskElement =
            candidate;

          break;
        }
      }

      if (taskElement) {
        break;
      }

      await page.waitForTimeout(500);
    }

    if (!taskElement) {
      throw new Error(
        `Созданная задача "${TASK_NAME}" не найдена на доске`
      );
    }

    console.log(
      `✅ Задача "${TASK_NAME}" найдена`
    );

    await visualPause(2000);

    // ============================================================
    // 8. ОТКРЫТИЕ ЗАДАЧИ
    // ============================================================

    console.log(
      '\n📝 Открытие задачи...'
    );

    await taskElement.click();

    console.log(
      '✅ Клик по задаче выполнен'
    );

    await visualPause(1000);

    console.log(
      `📍 URL после открытия задачи: ${page.url()}`
    );

    // ============================================================
    // 9. ПОИСК КНОПКИ "ЗАВЕРШИТЬ"
    // ============================================================

    console.log(
      '\n✅ Поиск кнопки "Завершить"...'
    );

    let completeButton = null;

    const buttonCandidates = [
      page.getByRole(
        'button',
        {
          name: 'Завершить',
          exact: true
        }
      ),

      page.getByText(
        'Завершить',
        {
          exact: true
        }
      )
    ];

    const completeSearchStart =
      Date.now();

    while (
      Date.now() -
        completeSearchStart <
      30000
    ) {
      for (
        const locator of buttonCandidates
      ) {
        const locatorCount =
          await locator.count();

        for (
          let i = 0;
          i < locatorCount;
          i++
        ) {
          const candidate =
            locator.nth(i);

          if (
            await candidate
              .isVisible()
              .catch(() => false)
          ) {
            completeButton =
              candidate;

            break;
          }
        }

        if (completeButton) {
          break;
        }
      }

      if (completeButton) {
        break;
      }

      await page.waitForTimeout(500);
    }

    if (!completeButton) {
      throw new Error(
        'Не найдена видимая кнопка "Завершить"'
      );
    }

    console.log(
      '✅ Кнопка "Завершить" найдена'
    );

    await visualPause(2000);

    // ============================================================
    // 10. ЗАВЕРШЕНИЕ + PATCH
    // ============================================================

    console.log(
      '\n📡 Завершаем задачу и ждём PATCH...'
    );

    const [patchResponse] =
      await Promise.all([
        page.waitForResponse(
          response => {
            const url =
              response.url();

            const method =
              response
                .request()
                .method();

            return (
              method === 'PATCH' &&
              url.includes('/tasks/') &&
              url.includes(
                '/change-task-status'
              )
            );
          },
          {
            timeout: 30000
          }
        ),

        completeButton.click()
      ]);

    console.log(
      '✅ Клик по "Завершить" выполнен'
    );

    // ============================================================
    // 11. ПРОВЕРКА API
    // ============================================================

    const status =
      patchResponse.status();

    const apiUrl =
      patchResponse.url();

    console.log(
      '\n🔍 Проверка PATCH запроса...'
    );

    console.log(
      `📡 URL API: ${apiUrl}`
    );

    console.log(
      `📊 HTTP статус: ${status}`
    );

    const taskIdMatch =
      apiUrl.match(
        /\/tasks\/([^/]+)\/change-task-status/
      );

    if (taskIdMatch) {
      console.log(
        `🆔 ID задачи: ${taskIdMatch[1]}`
      );
    }

    if (
      status >= 200 &&
      status < 300
    ) {
      console.log(
        '✅ Сервер успешно изменил статус задачи'
      );
    } else {
      throw new Error(
        `Сервер вернул HTTP ${status} при завершении задачи`
      );
    }

    // ============================================================
    // 12. ПРОВЕРКА ЖУРНАЛА RESPONSES
    // ============================================================

    const storedPatch =
      responses.find(
        r =>
          r.method === 'PATCH' &&
          r.url.includes('/tasks/') &&
          r.url.includes(
            '/change-task-status'
          )
      );

    if (storedPatch) {
      console.log(
        '✅ PATCH присутствует в журнале responses'
      );
    } else {
      console.warn(
        '⚠️ PATCH отсутствует в журнале responses'
      );
    }

    await visualPause(3000);

    // ============================================================
    // 13. СКРИНШОТ
    // ============================================================

    await page.screenshot({
      path: 'task-completed.png',
      fullPage: false
    });

    console.log(
      '📸 Скриншот сохранён: task-completed.png'
    );

    console.log(
      '\n✨ Независимый тест завершения задачи успешно пройден!'
    );

  } catch (error) {
    console.error(
      '\n❌ Ошибка при завершении задачи:',
      error.message
    );

    if (!page.isClosed()) {
      console.error(
        `📍 URL в момент ошибки: ${page.url()}`
      );

      await visualPause(3000);

      try {
        await page.screenshot({
          path: 'task-complete-error.png',
          fullPage: true
        });

        console.log(
          '📸 Скриншот ошибки сохранён: task-complete-error.png'
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
          'task-complete-error.html',
          html
        );

        console.log(
          '📄 HTML страницы сохранён: task-complete-error.html'
        );

      } catch (e) {
        console.warn(
          '⚠️ Не удалось сохранить HTML'
        );
      }
    }

    throw error;

  } finally {
    if (browser.isConnected()) {
      await browser.close();
    }

    console.log(
      '\nℹ️ Браузер закрыт'
    );
  }
}

completeTask()
  .then(() => {
    console.log(
      '\n✨ Тест завершения задачи завершён успешно'
    );
  })
  .catch(error => {
    console.error(
      '\n💥 Тест завершился с ошибкой:',
      error.message
    );

    process.exit(1);
  });