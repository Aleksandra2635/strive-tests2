const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function deleteProject() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const PROJECT_NAME = 'Тестовый проект — удаление';

  console.log('🚀 Запуск независимого теста удаления проекта...');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`📦 Проект: ${PROJECT_NAME}`);

  const browserOptions = getBrowserOptions();

  console.log(
    `🖥️ Режим браузера: ${
      browserOptions.headless ? 'headless' : 'видимый'
    }`
  );

  // В видимом режиме замедляем действия Playwright
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

  // Дополнительные паузы только в видимом режиме
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

    // ============================================================
    // 2. ПОИСК ПРОСТРАНСТВА
    // ============================================================

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

    for (let i = 0; i < spaceCount; i++) {
      const href = await spaceLinks
        .nth(i)
        .getAttribute('href');

      if (!href) {
        continue;
      }

      console.log(`   🔗 ${href}`);

      if (
        /\/spaces\/[^/]+\/projects\/?$/.test(href)
      ) {
        projectsHref = href;
        break;
      }
    }

    if (!projectsHref) {
      throw new Error(
        'Не удалось найти ссылку на пространство'
      );
    }

    console.log(
      `✅ Найдено пространство: ${projectsHref}`
    );

    await visualPause(1000);

    // ============================================================
    // 3. ПЕРЕХОД В ПРОЕКТЫ
    // ============================================================

    console.log(
      '\n📂 Переход к списку проектов...'
    );

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
      `📍 URL списка проектов: ${page.url()}`
    );

    await visualPause(1500);

    // ============================================================
    // 4. ОЖИДАНИЕ ПОЛНОЙ ЗАГРУЗКИ СТРАНИЦЫ ПРОЕКТОВ
    // ============================================================

    console.log(
      '\n⏳ Ожидание полной загрузки страницы проектов...'
    );

    const PROJECTS_LOAD_TIMEOUT = 30000;
    const CHECK_INTERVAL = 500;

    const loadStart = Date.now();

    let addProject = null;

    while (
      Date.now() - loadStart <
      PROJECTS_LOAD_TIMEOUT
    ) {
      const candidates = page.getByText(
        'Добавить проект',
        {
          exact: true
        }
      );

      const count = await candidates.count();

      for (let i = 0; i < count; i++) {
        const candidate = candidates.nth(i);

        if (
          await candidate
            .isVisible()
            .catch(() => false)
        ) {
          addProject = candidate;
          break;
        }
      }

      if (addProject) {
        break;
      }

      await page.waitForTimeout(
        CHECK_INTERVAL
      );
    }

    if (!addProject) {
      throw new Error(
        'Страница проектов не загрузилась за 30 секунд: "Добавить проект" не появилась'
      );
    }

    console.log(
      '✅ Страница проектов полностью загрузилась'
    );

    await visualPause(1500);

    // ============================================================
    // 5. СОЗДАНИЕ ПРОЕКТА
    // ============================================================

    console.log(
      '\n➕ Создание проекта для удаления...'
    );

    await addProject.click();

    console.log(
      '✅ Клик по "Добавить проект" выполнен'
    );

    await visualPause(1500);

    // ============================================================
    // 6. ПУСТОЙ ПРОЕКТ
    // ============================================================

    console.log(
      '\n📄 Выбор "Пустой проект"...'
    );

    const emptyProject =
      page.getByText(
        'Пустой проект',
        {
          exact: true
        }
      );

    await emptyProject.first().waitFor({
      state: 'visible',
      timeout: 15000
    });

    await visualPause(1000);

    await emptyProject.first().click();

    console.log(
      '✅ Выбран "Пустой проект"'
    );

    await visualPause(1500);

    // ============================================================
    // 7. НАЗВАНИЕ
    // ============================================================

    console.log(
      '\n📝 Ввод названия проекта...'
    );

    let projectInput =
      page.locator(
        'input[placeholder="Название проекта"]'
      );

    if (
      (await projectInput.count()) === 0
    ) {
      projectInput =
        page.locator(
          'input[type="text"]:visible'
        ).first();
    }

    await projectInput.waitFor({
      state: 'visible',
      timeout: 15000
    });

    await visualPause(1000);

    console.log(
      `⌨️ Ввод названия: "${PROJECT_NAME}"`
    );

    await projectInput.fill(
      PROJECT_NAME
    );

    console.log(
      `✅ Введено название: ${PROJECT_NAME}`
    );

    await visualPause(1500);

    // ============================================================
    // 8. СОЗДАТЬ ПРОЕКТ
    // ============================================================

    const createButton =
      page.getByRole(
        'button',
        {
          name: 'Создать проект',
          exact: true
        }
      );

    await createButton.waitFor({
      state: 'visible',
      timeout: 15000
    });

    await visualPause(1000);

    console.log(
      '\n💾 Создание проекта...'
    );

    await createButton.click();

    console.log(
      '✅ Клик по "Создать проект" выполнен'
    );

    // ============================================================
    // 9. ОЖИДАНИЕ ДОСКИ НОВОГО ПРОЕКТА
    // ============================================================

    console.log(
      '⏳ Ожидание открытия нового проекта...'
    );

    await page.waitForURL(
      url =>
        url.pathname.includes('/spaces/') &&
        url.pathname.includes('/tasks'),
      {
        timeout: 30000
      }
    );

    console.log(
      '✅ Проект создан!'
    );

    console.log(
      `📍 URL проекта: ${page.url()}`
    );

    await visualPause(2000);

    // ============================================================
    // 10. ВОЗВРАЩАЕМСЯ В СПИСОК
    // ============================================================

    console.log(
      '\n↩️ Возврат к списку проектов...'
    );

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
      '⏳ Ожидание загрузки списка проектов...'
    );

    const projectTitle =
      page.getByText(
        PROJECT_NAME,
        {
          exact: true
        }
      );

    let visibleProject = null;

    const projectStart =
      Date.now();

    while (
      Date.now() - projectStart <
      30000
    ) {
      const count =
        await projectTitle.count();

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const candidate =
          projectTitle.nth(i);

        if (
          await candidate
            .isVisible()
            .catch(() => false)
        ) {
          visibleProject =
            candidate;

          break;
        }
      }

      if (visibleProject) {
        break;
      }

      await page.waitForTimeout(500);
    }

    if (!visibleProject) {
      throw new Error(
        `Созданный проект "${PROJECT_NAME}" не найден`
      );
    }

    console.log(
      `✅ Проект "${PROJECT_NAME}" найден`
    );

    await visualPause(2000);

    // ============================================================
    // 11. ИЩЕМ КАРТОЧКУ ПРОЕКТА
    // ============================================================

    console.log(
      '\n🔎 Поиск карточки проекта...'
    );

    let projectCard =
      visibleProject;

    for (
      let level = 0;
      level < 10;
      level++
    ) {
      const parent =
        projectCard.locator('..');

      if (
        (await parent.count()) === 0
      ) {
        break;
      }

      projectCard =
        parent;

      const text =
        await projectCard
          .innerText()
          .catch(() => '');

      if (
        !text.includes(PROJECT_NAME)
      ) {
        continue;
      }

      const buttons =
        await projectCard.locator(
          'button, [role="button"], [class*="cursor-pointer"]'
        ).count();

      if (buttons > 0) {
        break;
      }
    }

    console.log(
      '✅ Карточка проекта найдена'
    );

    await visualPause(1000);

    console.log(
      '🖱️ Наведение на карточку проекта...'
    );

    await projectCard.hover({
      force: true
    });

    await visualPause(1500);

    // ============================================================
    // 12. МЕНЮ ПРОЕКТА
    // ============================================================

    console.log(
      '\n⋯ Поиск меню проекта...'
    );

    let menuButton = null;

    const buttonCandidates = [
      projectCard.locator(
        'button.dynamic-button'
      ),

      projectCard.locator(
        'button[class*="cursor-pointer"]'
      ),

      projectCard.locator(
        'button:has(svg)'
      )
    ];

    for (
      const locator of buttonCandidates
    ) {
      const count =
        await locator.count();

      for (
        let i = count - 1;
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
          menuButton =
            candidate;

          break;
        }
      }

      if (menuButton) {
        break;
      }
    }

    if (!menuButton) {
      throw new Error(
        'Не удалось найти кнопку меню проекта'
      );
    }

    console.log(
      '✅ Кнопка меню проекта найдена'
    );

    await visualPause(1000);

    console.log(
      '🖱️ Открытие меню проекта...'
    );

    await menuButton.click();

    console.log(
      '✅ Клик по меню проекта выполнен'
    );

    await visualPause(2000);

    // ============================================================
    // 13. УДАЛИТЬ ПРОЕКТ
    // ============================================================

    console.log(
      '\n🗑️ Поиск пункта "Удалить проект"...'
    );

    const deleteTexts =
      page.getByText(
        'Удалить проект',
        {
          exact: true
        }
      );

    let deleteText = null;

    const deleteStart =
      Date.now();

    while (
      Date.now() - deleteStart <
      10000
    ) {
      const count =
        await deleteTexts.count();

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const candidate =
          deleteTexts.nth(i);

        if (
          await candidate
            .isVisible()
            .catch(() => false)
        ) {
          deleteText =
            candidate;

          break;
        }
      }

      if (deleteText) {
        break;
      }

      await page.waitForTimeout(250);
    }

    if (!deleteText) {
      throw new Error(
        'Не удалось найти видимый пункт "Удалить проект"'
      );
    }

    console.log(
      '✅ Пункт "Удалить проект" найден'
    );

    await visualPause(1500);

    const deleteButton =
      deleteText.locator(
        'xpath=ancestor::*[contains(@class,"cursor-pointer")][1]'
      );

    console.log(
      '🖱️ Нажатие "Удалить проект"...'
    );

    if (
      (await deleteButton.count()) > 0
    ) {
      await deleteButton.click();
    } else {
      await deleteText.click();
    }

    console.log(
      '✅ Клик по "Удалить проект" выполнен'
    );

    await visualPause(2000);

    // ============================================================
    // 14. ПОДТВЕРЖДЕНИЕ
    // ============================================================

    console.log(
      '\n✅ Ожидание подтверждения удаления...'
    );

    const confirmButton =
      page.locator(
        '#modalBoxSubmitButton'
      );

    await confirmButton.waitFor({
      state: 'visible',
      timeout: 10000
    });

    console.log(
      '✅ Окно подтверждения открыто'
    );

    // Даём возможность глазами увидеть модалку удаления
    await visualPause(2000);

    // ============================================================
    // 15. PATCH
    // ============================================================

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
              url.includes(
                '/project-space-column'
              )
            );
          },
          {
            timeout: 15000
          }
        ),

        confirmButton.click()
      ]);

    const status =
      patchResponse.status();

    console.log(
      '✅ Подтверждение удаления выполнено'
    );

    console.log(
      `📡 URL API: ${patchResponse.url()}`
    );

    console.log(
      `📊 HTTP статус: ${status}`
    );

    if (
      status < 200 ||
      status >= 300
    ) {
      throw new Error(
        `Сервер вернул HTTP ${status} при удалении проекта`
      );
    }

    console.log(
      '✅ Сервер успешно удалил проект / отправил его в корзину'
    );

    await visualPause(2000);

    // ============================================================
    // 16. ПРОВЕРКА UI
    // ============================================================

    console.log(
      '\n🔍 Проверка исчезновения проекта...'
    );

    try {
      await visibleProject.waitFor({
        state: 'hidden',
        timeout: 10000
      });

      console.log(
        `✅ Проект "${PROJECT_NAME}" исчез из списка`
      );

    } catch (error) {
      console.warn(
        '⚠️ Проект ещё отображается либо список ещё не обновился'
      );
    }

    // Финальный экран держим подольше
    await visualPause(3000);

    // ============================================================
    // 17. СКРИНШОТ
    // ============================================================

    await page.screenshot({
      path: 'project-deleted.png',
      fullPage: false
    });

    console.log(
      '📸 Скриншот сохранён: project-deleted.png'
    );

    console.log(
      '\n✨ Независимый тест удаления проекта успешно пройден!'
    );

  } catch (error) {
    console.error(
      '\n❌ Ошибка при удалении проекта:',
      error.message
    );

    if (!page.isClosed()) {
      console.error(
        `📍 URL в момент ошибки: ${page.url()}`
      );

      // Оставляем проблемный экран видимым,
      // чтобы можно было понять место падения
      await visualPause(3000);

      try {
        await page.screenshot({
          path: 'project-delete-error.png',
          fullPage: true
        });

        console.log(
          '📸 Скриншот ошибки сохранён: project-delete-error.png'
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
          'project-delete-error.html',
          html
        );

        console.log(
          '📄 HTML страницы сохранён: project-delete-error.html'
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

deleteProject()
  .then(() => {
    console.log(
      '\n✨ Тест удаления проекта завершён успешно'
    );
  })
  .catch(error => {
    console.error(
      '\n💥 Тест завершился с ошибкой:',
      error.message
    );

    process.exit(1);
  });