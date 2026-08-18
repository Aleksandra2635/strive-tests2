const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function createColumn() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const COLUMN_NAME = 'Тестовая колонка';

  console.log('🚀 Запуск теста создания колонки...');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`📋 Название колонки: ${COLUMN_NAME}`);

  const browserOptions = getBrowserOptions();

  console.log(
    `🖥️ Режим браузера: ${browserOptions.headless ? 'headless' : 'видимый'}`
  );

  // В видимом режиме замедляем действия Playwright.
  // В GitHub Actions headless=true, поэтому slowMo там не используется.
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

  // Общий timeout для локаторов.
  page.setDefaultTimeout(60000);

  // Навигация в CI может быть заметно медленнее.
  page.setDefaultNavigationTimeout(90000);

  const visualPause = async (ms = 1000) => {
    if (!browserOptions.headless) {
      await page.waitForTimeout(ms);
    }
  };

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

    console.log(
      '📝 Ввод email...'
    );

    await page.fill(
      '[name="email"]',
      USER_EMAIL
    );

    await visualPause(500);

    console.log(
      '📝 Ввод пароля...'
    );

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
    // 2. ПОИСК ПРОСТРАНСТВА
    // ============================================================

    console.log(
      '\n📁 Поиск пространства или проекта...'
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

    const linksCount =
      await spaceLinks.count();

    console.log(
      `🔎 Найдено ссылок, содержащих /spaces/: ${linksCount}`
    );

    let boardHref = null;
    let projectsHref = null;

    for (
      let i = 0;
      i < linksCount;
      i++
    ) {
      const href =
        await spaceLinks
          .nth(i)
          .getAttribute('href');

      if (!href) {
        continue;
      }

      console.log(
        `   🔗 ${href}`
      );

      if (
        href.includes('/tasks') &&
        !boardHref
      ) {
        boardHref = href;
      }

      if (
        /\/spaces\/[^/]+\/projects\/?$/.test(href) &&
        !projectsHref
      ) {
        projectsHref = href;
      }
    }

    await visualPause(1000);

    // ============================================================
    // 3. ПЕРЕХОД НА ДОСКУ ПРОЕКТА
    // ============================================================

    if (boardHref) {
      console.log(
        '\n📂 Найдена прямая ссылка на доску проекта'
      );

      console.log(
        `🔗 ${boardHref}`
      );

      await visualPause(1000);

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
        '\n📁 Переход к списку проектов пространства...'
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

      // ============================================================
      // 3.1 ЖДЁМ РЕАЛЬНУЮ ЗАГРУЗКУ ПРОЕКТОВ
      // ============================================================

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

      await visualPause(1000);

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
        'Не удалось найти ни пространство, ни проект'
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
    // 4. ЖДЁМ РЕАЛЬНУЮ ЗАГРУЗКУ ДОСКИ
    // ============================================================

    console.log(
      '\n⏳ Ожидание полной загрузки доски...'
    );

    const BOARD_LOAD_TIMEOUT = 60000;
    const CHECK_INTERVAL = 500;

    const startTime =
      Date.now();

    let addColumn = null;

    while (
      Date.now() - startTime <
      BOARD_LOAD_TIMEOUT
    ) {
      const addColumnCandidates =
        page.getByText(
          'Добавить колонку',
          {
            exact: true
          }
        );

      const count =
        await addColumnCandidates.count();

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const candidate =
          addColumnCandidates.nth(i);

        if (
          await candidate
            .isVisible()
            .catch(() => false)
        ) {
          addColumn = candidate;
          break;
        }
      }

      if (addColumn) {
        break;
      }

      await page.waitForTimeout(
        CHECK_INTERVAL
      );
    }

    if (!addColumn) {
      throw new Error(
        'Доска не загрузилась за 60 секунд: "Добавить колонку" не стала видимой'
      );
    }

    console.log(
      '✅ Доска полностью загрузилась'
    );

    await visualPause(1500);

    // ============================================================
    // 5. ДОБАВЛЕНИЕ КОЛОНКИ
    // ============================================================

    console.log(
      '\n➕ Нажатие на "Добавить колонку"...'
    );

    await addColumn.click();

    console.log(
      '✅ Клик по "Добавить колонку" выполнен'
    );

    await visualPause(1500);

    // ============================================================
    // 6. ПОЛЕ НАЗВАНИЯ КОЛОНКИ
    // ============================================================

    console.log(
      '\n📝 Поиск поля названия колонки...'
    );

    let columnInput =
      page.locator(
        'textarea[type="text"]:visible'
      );

    if (
      (await columnInput.count()) === 0
    ) {
      columnInput =
        page
          .locator('textarea:visible')
          .first();
    }

    await columnInput.waitFor({
      state: 'visible',
      timeout: 30000
    });

    console.log(
      '✅ Поле названия колонки найдено'
    );

    await visualPause(1000);

    console.log(
      `⌨️ Ввод названия: "${COLUMN_NAME}"`
    );

    await columnInput.fill(
      COLUMN_NAME
    );

    console.log(
      `✅ Введено название: ${COLUMN_NAME}`
    );

    await visualPause(1500);

    // ============================================================
    // 7. СОХРАНЕНИЕ + POST
    // ============================================================

    console.log(
      '\n💾 Сохранение колонки клавишей Enter...'
    );

    await visualPause(1000);

    const [response] =
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
              url.includes('/projects/') &&
              url.includes('/stages')
            );
          },
          {
            timeout: 30000
          }
        ),

        columnInput.press('Enter')
      ]);

    console.log(
      '✅ Enter нажат'
    );

    await visualPause(1500);

    // ============================================================
    // 8. ПРОВЕРКА API
    // ============================================================

    const status =
      response.status();

    const responseUrl =
      response.url();

    console.log(
      '\n🔍 Проверка ответа сервера...'
    );

    console.log(
      `📡 URL: ${responseUrl}`
    );

    console.log(
      `📊 HTTP статус: ${status}`
    );

    if (
      status < 200 ||
      status >= 300
    ) {
      throw new Error(
        `Сервер вернул ошибку при создании колонки: HTTP ${status}`
      );
    }

    console.log(
      '✅ Сервер успешно обработал создание колонки'
    );

    try {
      const data =
        await response.json();

      console.log(
        '📦 Ответ сервера:'
      );

      if (
        data.id !== undefined
      ) {
        console.log(
          `   ID: ${data.id}`
        );
      }

      if (
        data.name !== undefined
      ) {
        console.log(
          `   Название: ${data.name}`
        );
      }

      if (
        data.order !== undefined
      ) {
        console.log(
          `   Order: ${data.order}`
        );
      }

      if (
        data.projectId !== undefined
      ) {
        console.log(
          `   Project ID: ${data.projectId}`
        );
      }

      if (
        data.name === COLUMN_NAME
      ) {
        console.log(
          '✅ Сервер вернул правильное название колонки'
        );
      }

    } catch (e) {
      console.warn(
        '⚠️ Ответ сервера не удалось распарсить как JSON'
      );
    }

    // ============================================================
    // 9. ПРОВЕРКА UI
    // ============================================================

    console.log(
      '\n🔎 Проверка созданной колонки в интерфейсе...'
    );

    const createdColumn =
      page.getByText(
        COLUMN_NAME,
        {
          exact: true
        }
      );

    await createdColumn
      .first()
      .waitFor({
        state: 'visible',
        timeout: 30000
      });

    console.log(
      `✅ Колонка "${COLUMN_NAME}" отображается на доске`
    );

    await visualPause(3000);

    // ============================================================
    // 10. СКРИНШОТ
    // ============================================================

    await page.screenshot({
      path: 'column-created.png',
      fullPage: false
    });

    console.log(
      '📸 Скриншот сохранён: column-created.png'
    );

    console.log(
      '\n✨ Колонка успешно создана!'
    );

  } catch (error) {
    console.error(
      '\n❌ Ошибка при создании колонки:',
      error.message
    );

    if (!page.isClosed()) {
      console.error(
        `📍 URL в момент ошибки: ${page.url()}`
      );

      await visualPause(3000);

      try {
        await page.screenshot({
          path: 'column-error.png',
          fullPage: true
        });

        console.log(
          '📸 Скриншот ошибки сохранён: column-error.png'
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
          'column-error.html',
          html
        );

        console.log(
          '📄 HTML страницы сохранён: column-error.html'
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

createColumn()
  .then(() => {
    console.log(
      '\n✨ Тест создания колонки завершён успешно'
    );
  })
  .catch(error => {
    console.error(
      '\n💥 Тест завершился с ошибкой:',
      error.message
    );

    process.exit(1);
  });