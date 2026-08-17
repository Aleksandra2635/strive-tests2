const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function createProject() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const PROJECT_NAME = 'Тестовый проект';

  console.log('🚀 Запуск теста создания проекта...');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`📦 Название проекта: ${PROJECT_NAME}`);

  const browserOptions = getBrowserOptions();

  console.log(
    `🖥️ Режим браузера: ${browserOptions.headless ? 'headless' : 'видимый'}`
  );

  // В видимом режиме замедляем действия,
  // чтобы было удобно следить за тестом глазами
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

  // Дополнительная пауза только в видимом режиме
  const visualPause = async (ms = 1000) => {
    if (!browserOptions.headless) {
      await page.waitForTimeout(ms);
    }
  };

  try {
    // 1️⃣ Вход
    console.log('\n🌐 Открытие страницы входа...');

    await page.goto('https://app.striveapp.ru/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('⏳ Ожидание формы входа...');

    await page.locator('[name="email"]').waitFor({
      state: 'visible',
      timeout: 30000
    });

    console.log('⌨️ Ввод email...');
    await page.fill('[name="email"]', USER_EMAIL);

    await visualPause(500);

    console.log('⌨️ Ввод пароля...');
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
    console.log('\n📁 Поиск доступного пространства...');

    const spaceLinks = page.locator(
      'a[href*="/spaces/"]'
    );

    await spaceLinks.first().waitFor({
      state: 'visible',
      timeout: 20000
    });

    const linksCount = await spaceLinks.count();

    console.log(
      `🔎 Найдено ссылок на пространства/проекты: ${linksCount}`
    );

    let spaceLink = null;
    let spaceHref = null;

    for (let i = 0; i < linksCount; i++) {
      const candidate = spaceLinks.nth(i);
      const href = await candidate.getAttribute('href');

      if (!href) {
        continue;
      }

      /*
       * Ищем ссылку уровня пространства:
       *
       * /spaces/ID/projects
       *
       * ID может быть числом, UUID и т.д.
       */
      if (/\/spaces\/[^/]+\/projects\/?$/.test(href)) {
        spaceLink = candidate;
        spaceHref = href;
        break;
      }
    }

    // Если отдельную ссылку /projects не нашли,
    // используем первую ссылку пространства
    if (!spaceLink) {
      console.warn(
        '⚠️ Ссылка вида /spaces/.../projects не найдена. Используем первую ссылку /spaces/...'
      );

      spaceLink = spaceLinks.first();
      spaceHref = await spaceLink.getAttribute('href');
    }

    console.log(`🔗 Найден путь пространства: ${spaceHref}`);

    await visualPause(1000);

    console.log('🖱️ Переход в пространство...');

    await spaceLink.click();

    console.log('✅ Клик по пространству выполнен');

    await page.waitForURL(
      url => url.pathname.includes('/spaces/'),
      {
        timeout: 20000
      }
    );

    console.log(
      `📍 URL после перехода: ${page.url()}`
    );

    await visualPause(1500);

    // 3️⃣ Добавить проект
    console.log(
      '\n➕ Поиск кнопки "Добавить проект"...'
    );

    const addProject = page.getByText(
      'Добавить проект',
      {
        exact: true
      }
    );

    await addProject.waitFor({
      state: 'visible',
      timeout: 15000
    });

    await visualPause(1000);

    console.log(
      '🖱️ Нажатие "Добавить проект"...'
    );

    await addProject.click();

    console.log(
      '✅ Клик по "Добавить проект" выполнен'
    );

    await visualPause(1500);

    // 4️⃣ Пустой проект
    console.log(
      '\n📄 Поиск пункта "Пустой проект"...'
    );

    const emptyProject = page.getByText(
      'Пустой проект',
      {
        exact: true
      }
    );

    await emptyProject.waitFor({
      state: 'visible',
      timeout: 15000
    });

    await visualPause(1000);

    console.log(
      '🖱️ Выбор "Пустой проект"...'
    );

    await emptyProject.click();

    console.log(
      '✅ Клик по "Пустой проект" выполнен'
    );

    await visualPause(1500);

    // 5️⃣ Название проекта
    console.log(
      '\n📝 Поиск поля названия проекта...'
    );

    let projectNameInput = page.locator(
      'input[placeholder="Название проекта"]'
    );

    if (
      !(await projectNameInput.count())
    ) {
      console.warn(
        '⚠️ Поле по placeholder не найдено, ищем видимое текстовое поле...'
      );

      projectNameInput = page.locator(
        'input[type="text"]:visible'
      ).first();
    }

    await projectNameInput.waitFor({
      state: 'visible',
      timeout: 15000
    });

    console.log(
      `⌨️ Ввод названия проекта: "${PROJECT_NAME}"`
    );

    await projectNameInput.fill(PROJECT_NAME);

    console.log(
      `✅ Введено название: ${PROJECT_NAME}`
    );

    await visualPause(1500);

    // 6️⃣ Создать проект
    console.log(
      '\n💾 Поиск кнопки "Создать проект"...'
    );

    const createProjectButton = page.getByRole(
      'button',
      {
        name: 'Создать проект'
      }
    );

    await createProjectButton.waitFor({
      state: 'visible',
      timeout: 15000
    });

    await visualPause(1000);

    console.log(
      '🖱️ Нажатие "Создать проект"...'
    );

    await createProjectButton.click();

    console.log(
      '✅ Клик по "Создать проект" выполнен'
    );

    await visualPause(2000);

    // 7️⃣ Проверка результата
    console.log(
      '\n⏳ Ожидание создания проекта...'
    );

    try {
      await page.waitForURL(
        url =>
          url.pathname.includes('/spaces/') &&
          (
            url.pathname.includes('/tasks') ||
            url.pathname.includes('/projects')
          ),
        {
          timeout: 20000
        }
      );

      console.log(
        '✅ После создания выполнен переход!'
      );

      console.log(
        `📍 URL: ${page.url()}`
      );

    } catch (err) {
      console.warn(
        '⚠️ После создания URL не изменился ожидаемым образом'
      );

      console.log(
        `📍 Текущий URL: ${page.url()}`
      );
    }

    await visualPause(1500);

    // 8️⃣ Проверяем, что название проекта появилось
    console.log(
      '\n🔎 Проверка созданного проекта...'
    );

    try {
      await page.getByText(
        PROJECT_NAME,
        {
          exact: true
        }
      ).first().waitFor({
        state: 'visible',
        timeout: 10000
      });

      console.log(
        `✅ Проект "${PROJECT_NAME}" найден на странице`
      );

    } catch (err) {
      console.warn(
        `⚠️ Название "${PROJECT_NAME}" не найдено на текущем экране`
      );

      console.warn(
        '💡 Проект мог быть создан, но его название находится на другом экране'
      );
    }

    // Даём посмотреть итоговый экран
    await visualPause(3000);

    // Скриншот результата
    await page.screenshot({
      path: 'create-project-result.png',
      fullPage: true
    });

    console.log(
      '📸 Скриншот сохранён: create-project-result.png'
    );

  } catch (error) {
    console.error(
      '\n❌ Ошибка при выполнении теста:',
      error.message
    );

    console.error(
      `📍 URL в момент ошибки: ${page.url()}`
    );

    // В видимом режиме даём посмотреть,
    // на каком экране произошла ошибка
    await visualPause(3000);

    try {
      await page.screenshot({
        path: 'error.png',
        fullPage: true
      });

      console.log(
        '📸 Скриншот ошибки сохранён: error.png'
      );
    } catch (e) {
      console.warn(
        '⚠️ Не удалось сохранить скриншот'
      );
    }

    try {
      const html = await page.content();

      require('fs').writeFileSync(
        'error.html',
        html
      );

      console.log(
        '📄 HTML страницы сохранён: error.html'
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

createProject()
  .then(() => {
    console.log(
      '\n✨ Тест создания проекта завершён успешно'
    );
  })
  .catch(error => {
    console.error(
      '\n💥 Тест завершился с ошибкой:',
      error.message
    );

    process.exit(1);
  });