const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function deleteTask() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const TASK_NAME = 'Тестовая задача — удаление';

  console.log('🚀 Запуск теста удаления задачи...');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`📝 Задача: ${TASK_NAME}`);

  const browserOptions = getBrowserOptions();

  console.log(
    `🖥️ Режим браузера: ${browserOptions.headless ? 'headless' : 'видимый'}`
  );

  // В видимом режиме замедляем действия Playwright,
  // чтобы можно было глазами следить за тестом.
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

  // Дополнительные паузы только в видимом режиме.
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
      url.includes('/archive')
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
    // 1️⃣ Авторизация
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

    await page.locator('button[type="submit"]').click();

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
      const href = await spaceLinks
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

    // 3️⃣ Переход на доску проекта
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

      const projectHref = await projectLinks
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

    // 4️⃣ Ждём загрузку доски
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
        const candidate = candidates.nth(i);

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

    // 5️⃣ Создание задачи для удаления
    console.log(
      '\n➕ Создание задачи для удаления...'
    );

    await addTask.click();

    console.log(
      '✅ Клик по "Добавить задачу" выполнен'
    );

    await visualPause(1500);

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

    // 6️⃣ Сохранение задачи
    console.log(
      '\n💾 Сохранение созданной задачи...'
    );

    let createTaskResponse = null;

    await visualPause(1000);

    try {
      [createTaskResponse] =
        await Promise.all([
          page.waitForResponse(
            response => {
              const url = response.url();
              const method =
                response.request().method();

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
            const url = response.url();
            const method =
              response.request().method();

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

      await page.locator('body').click({
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
      '✅ Задача для удаления создана'
    );

    await visualPause(2000);

    // 7️⃣ Ищем созданную задачу
    console.log(
      `\n🔎 Поиск созданной задачи "${TASK_NAME}"...`
    );

    const taskText = page.getByText(
      TASK_NAME,
      {
        exact: true
      }
    );

    let taskElement = null;

    const taskSearchStart = Date.now();

    while (
      Date.now() - taskSearchStart <
      20000
    ) {
      const taskCount =
        await taskText.count();

      for (
        let i = 0;
        i < taskCount;
        i++
      ) {
        const candidate =
          taskText.nth(i);

        if (await candidate.isVisible()) {
          taskElement = candidate;
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
        `Созданная задача "${TASK_NAME}" не найдена`
      );
    }

    console.log(
      `✅ Задача "${TASK_NAME}" найдена`
    );

    await visualPause(2000);

    // 8️⃣ Ищем карточку задачи
    console.log(
      '\n🔎 Поиск карточки задачи...'
    );

    let taskCard = taskElement;

    for (let i = 0; i < 8; i++) {
      const parent = taskCard.locator('..');

      if ((await parent.count()) === 0) {
        break;
      }

      taskCard = parent;

      const text =
        await taskCard
          .innerText()
          .catch(() => '');

      if (
        text.includes(TASK_NAME)
      ) {
        const interactiveCount =
          await taskCard.locator(
            'button, [role="button"], svg'
          ).count();

        if (interactiveCount > 0) {
          break;
        }
      }
    }

    console.log(
      '✅ Контейнер задачи найден'
    );

    await visualPause(1000);

    console.log(
      '🖱️ Наведение на карточку задачи...'
    );

    await taskCard.hover({
      force: true
    });

    await visualPause(1500);

    // 9️⃣ Поиск меню задачи
    console.log(
      '\n⋯ Поиск меню задачи...'
    );

    let menuButton = null;

    const possibleMenuButtons = [
      taskCard.locator(
        'button[aria-label*="меню" i]'
      ),

      taskCard.locator(
        '[role="button"][aria-label*="меню" i]'
      ),

      taskCard.locator(
        'button:has(svg)'
      ),

      taskCard.locator(
        '[role="button"]:has(svg)'
      )
    ];

    for (const locator of possibleMenuButtons) {
      const locatorCount =
        await locator.count();

      for (
        let i = locatorCount - 1;
        i >= 0;
        i--
      ) {
        const candidate =
          locator.nth(i);

        if (
          await candidate
            .isVisible()
            .catch(() => false)
        ) {
          menuButton = candidate;
          break;
        }
      }

      if (menuButton) {
        break;
      }
    }

    if (!menuButton) {
      const svgParents =
        taskCard.locator(
          'div:has(> svg)'
        );

      const svgParentsCount =
        await svgParents.count();

      for (
        let i = svgParentsCount - 1;
        i >= 0;
        i--
      ) {
        const candidate =
          svgParents.nth(i);

        if (
          await candidate
            .isVisible()
            .catch(() => false)
        ) {
          menuButton = candidate;
          break;
        }
      }
    }

    if (!menuButton) {
      throw new Error(
        'Не удалось найти меню созданной задачи'
      );
    }

    console.log(
      '✅ Кнопка меню задачи найдена'
    );

    await visualPause(1200);

    console.log(
      '🖱️ Открытие меню задачи...'
    );

    await menuButton.click();

    console.log(
      '✅ Меню задачи открыто'
    );

    await visualPause(2000);

    // 🔟 Поиск пункта "Удалить"
    console.log(
      '\n🗑️ Поиск пункта "Удалить"...'
    );

    const deleteCandidates =
      page.getByText(
        'Удалить',
        {
          exact: true
        }
      );

    let deleteButton = null;

    const deleteCount =
      await deleteCandidates.count();

    for (
      let i = 0;
      i < deleteCount;
      i++
    ) {
      const candidate =
        deleteCandidates.nth(i);

      if (
        await candidate
          .isVisible()
          .catch(() => false)
      ) {
        deleteButton = candidate;
        break;
      }
    }

    if (!deleteButton) {
      throw new Error(
        'Не удалось найти видимый пункт "Удалить"'
      );
    }

    console.log(
      '✅ Пункт "Удалить" найден'
    );

    await visualPause(1500);

    console.log(
      '🖱️ Нажатие "Удалить"...'
    );

    await deleteButton.click();

    console.log(
      '✅ Клик по "Удалить" выполнен'
    );

    await visualPause(2000);

    // 1️⃣1️⃣ Подтверждение удаления
    console.log(
      '\n✅ Поиск кнопки подтверждения удаления...'
    );

    let confirmButton = null;

    const confirmCandidates = [
      page.locator(
        '#modalBoxSubmitButton'
      ),

      page.getByRole(
        'button',
        {
          name: 'Удалить',
          exact: true
        }
      ),

      page.getByRole(
        'button',
        {
          name: /подтвердить/i
        }
      )
    ];

    for (const locator of confirmCandidates) {
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
          confirmButton = candidate;
          break;
        }
      }

      if (confirmButton) {
        break;
      }
    }

    if (!confirmButton) {
      throw new Error(
        'Не удалось найти кнопку подтверждения удаления'
      );
    }

    console.log(
      '✅ Кнопка подтверждения найдена'
    );

    // Модалку держим дольше, чтобы её можно было рассмотреть.
    await visualPause(2500);

    // 1️⃣2️⃣ Удаляем + ждём PATCH
    console.log(
      '\n📡 Подтверждаем удаление и ждём PATCH...'
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
              url.includes('/archive')
            );
          },
          {
            timeout: 15000
          }
        ),

        confirmButton.click()
      ]);

    console.log(
      '✅ Подтверждение удаления выполнено'
    );

    await visualPause(1500);

    // 1️⃣3️⃣ Проверка API
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
        /\/tasks\/([^/]+)\/archive/
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
        '✅ Сервер успешно отправил задачу в корзину'
      );
    } else {
      throw new Error(
        `Сервер вернул HTTP ${status} при удалении задачи`
      );
    }

    await visualPause(1500);

    // 1️⃣4️⃣ Проверка журнала responses
    const storedPatch =
      responses.find(
        r =>
          r.method === 'PATCH' &&
          r.url.includes('/tasks/') &&
          r.url.includes('/archive')
      );

    if (storedPatch) {
      console.log(
        '✅ PATCH присутствует в журнале responses'
      );
    }

    // 1️⃣5️⃣ Проверка исчезновения задачи
    console.log(
      '\n🔍 Проверка исчезновения задачи с доски...'
    );

    try {
      await taskText
        .first()
        .waitFor({
          state: 'hidden',
          timeout: 10000
        });

      console.log(
        `✅ Задача "${TASK_NAME}" исчезла с доски`
      );

    } catch (err) {
      console.warn(
        `⚠️ Задача "${TASK_NAME}" всё ещё отображается либо интерфейс ещё не обновился`
      );
    }

    // Финальное состояние доски оставляем на экране.
    await visualPause(3000);

    // 1️⃣6️⃣ Скриншот
    await page.screenshot({
      path: 'task-deleted.png',
      fullPage: false
    });

    console.log(
      '📸 Скриншот сохранён: task-deleted.png'
    );

    console.log(
      '\n✨ Независимый тест удаления задачи успешно пройден!'
    );

  } catch (error) {
    console.error(
      '\n❌ Ошибка при удалении задачи:',
      error.message
    );

    if (!page.isClosed()) {
      console.error(
        `📍 URL в момент ошибки: ${page.url()}`
      );

      // В видимом режиме оставляем экран ошибки
      // на несколько секунд перед закрытием браузера.
      await visualPause(3000);

      try {
        await page.screenshot({
          path: 'task-delete-error.png',
          fullPage: true
        });

        console.log(
          '📸 Скриншот ошибки сохранён: task-delete-error.png'
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
          'task-delete-error.html',
          html
        );

        console.log(
          '📄 HTML страницы сохранён: task-delete-error.html'
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

deleteTask()
  .then(() => {
    console.log(
      '\n✨ Тест удаления задачи завершён успешно'
    );
  })
  .catch(error => {
    console.error(
      '\n💥 Тест завершился с ошибкой:',
      error.message
    );

    process.exit(1);
  });