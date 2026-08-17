const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function deleteColumn() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;

  // Тест сам создаёт эту колонку, а затем удаляет её.
  const COLUMN_NAME = 'Тестовая колонка — удаление';

  console.log('🚀 Запуск независимого теста удаления колонки...');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`📋 Колонка: ${COLUMN_NAME}`);

  const browserOptions = getBrowserOptions();

  console.log(
    `🖥️ Режим браузера: ${
      browserOptions.headless ? 'headless' : 'видимый'
    }`
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

  try {
    /*
     * ============================================================
     * 1. АВТОРИЗАЦИЯ
     * ============================================================
     */

    console.log('\n🌐 Открытие страницы входа...');

    await page.goto(
      'https://app.striveapp.ru/login',
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }
    );

    await page
      .locator('[name="email"]')
      .waitFor({
        state: 'visible',
        timeout: 30000
      });

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
        timeout: 45000
      }
    );

    console.log('✅ Вход выполнен!');

    console.log(
      `🏠 Текущий URL: ${page.url()}`
    );

    await visualPause(1500);

    /*
     * ============================================================
     * 2. ПОИСК ПРОСТРАНСТВА
     * ============================================================
     */

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
        timeout: 20000
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
        /\/spaces\/[^/]+\/projects\/?$/.test(
          href
        ) &&
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

    /*
     * ============================================================
     * 3. ПЕРЕХОД НА ДОСКУ ПРОЕКТА
     * ============================================================
     */

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
          waitUntil: 'domcontentloaded',
          timeout: 30000
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
          waitUntil: 'domcontentloaded',
          timeout: 30000
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

    console.log(
      '✅ Доска проекта открыта'
    );

    console.log(
      `📍 URL проекта: ${page.url()}`
    );

    await visualPause(1500);

    /*
     * ============================================================
     * 4. ЖДЁМ ЗАГРУЗКУ ДОСКИ
     * ============================================================
     */

    console.log(
      '\n⏳ Ожидание полной загрузки доски...'
    );

    // Исходная функциональная задержка.
    await page.waitForTimeout(2000);

    const addColumnText =
      page.getByText(
        /Добавить колонку/i
      );

    await addColumnText
      .first()
      .waitFor({
        state: 'visible',
        timeout: 30000
      });

    console.log(
      '✅ Доска полностью загрузилась'
    );

    await visualPause(1500);

    /*
     * ============================================================
     * 5. СОЗДАЁМ КОЛОНКУ
     * ============================================================
     */

    console.log(
      '\n➕ Создание колонки для удаления...'
    );

    let addColumnButton = null;

    const addColumnCount =
      await addColumnText.count();

    for (
      let i = 0;
      i < addColumnCount;
      i++
    ) {
      const candidate =
        addColumnText.nth(i);

      if (
        await candidate.isVisible()
      ) {
        addColumnButton =
          candidate;

        break;
      }
    }

    if (!addColumnButton) {
      throw new Error(
        'Не удалось найти кнопку "Добавить колонку"'
      );
    }

    await visualPause(1000);

    console.log(
      '🖱️ Нажатие "Добавить колонку"...'
    );

    await addColumnButton.click();

    console.log(
      '✅ Клик по "Добавить колонку" выполнен'
    );

    await visualPause(1500);

    /*
     * Ищем появившееся поле для названия.
     */

    console.log(
      '\n📝 Поиск поля названия колонки...'
    );

    const textareas =
      page.locator('textarea');

    const textareaCount =
      await textareas.count();

    let columnInput = null;

    for (
      let i = textareaCount - 1;
      i >= 0;
      i--
    ) {
      const candidate =
        textareas.nth(i);

      if (
        await candidate.isVisible()
      ) {
        columnInput =
          candidate;

        break;
      }
    }

    if (!columnInput) {
      throw new Error(
        'Не найдено поле ввода названия колонки'
      );
    }

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

    /*
     * ============================================================
     * 6. СОХРАНЯЕМ И ЖДЁМ POST
     * ============================================================
     */

    console.log(
      '\n💾 Сохранение колонки...'
    );

    const createResponsePromise =
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
            /\/projects\/[^/]+\/stages/.test(
              url
            )
          );
        },
        {
          timeout: 15000
        }
      );

    await visualPause(1000);

    console.log(
      '⌨️ Нажатие Enter...'
    );

    await columnInput.press(
      'Enter'
    );

    const createResponse =
      await createResponsePromise;

    const createStatus =
      createResponse.status();

    const createUrl =
      createResponse.url();

    console.log(
      `📡 POST: ${createUrl}`
    );

    console.log(
      `📊 Статус создания: ${createStatus}`
    );

    if (
      createStatus < 200 ||
      createStatus >= 300
    ) {
      throw new Error(
        `Не удалось создать колонку. HTTP ${createStatus}`
      );
    }

    console.log(
      '✅ Колонка для удаления успешно создана'
    );

    await visualPause(2000);

    /*
     * ============================================================
     * 7. ИЩЕМ СОЗДАННУЮ КОЛОНКУ
     * ============================================================
     */

    console.log(
      `\n🔎 Поиск колонки "${COLUMN_NAME}"...`
    );

    const columnTitle =
      page.getByText(
        COLUMN_NAME,
        {
          exact: true
        }
      );

    let visibleColumnTitle = null;

    const COLUMN_TIMEOUT =
      30000;

    const startTime =
      Date.now();

    while (
      Date.now() - startTime <
      COLUMN_TIMEOUT
    ) {
      const count =
        await columnTitle.count();

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const candidate =
          columnTitle.nth(i);

        if (
          await candidate
            .isVisible()
            .catch(() => false)
        ) {
          visibleColumnTitle =
            candidate;

          break;
        }
      }

      if (visibleColumnTitle) {
        break;
      }

      await page.waitForTimeout(
        500
      );
    }

    if (!visibleColumnTitle) {
      throw new Error(
        `Не удалось найти колонку "${COLUMN_NAME}"`
      );
    }

    console.log(
      `✅ Колонка "${COLUMN_NAME}" найдена`
    );

    await visualPause(2000);

    /*
     * ============================================================
     * 8. ИЩЕМ КОНТЕЙНЕР ИМЕННО ЭТОЙ КОЛОНКИ
     * ============================================================
     */

    console.log(
      '\n🔎 Поиск контейнера колонки...'
    );

    let columnContainer =
      visibleColumnTitle;

    let menuSvg = null;

    const threeDotsSelector =
      'svg:has(path[d^="M5.40039 9C5.40039 9.66268"])';

    for (
      let level = 0;
      level < 10;
      level++
    ) {
      const parent =
        columnContainer.locator(
          '..'
        );

      if (
        (await parent.count()) === 0
      ) {
        break;
      }

      columnContainer =
        parent;

      const text =
        await columnContainer
          .innerText()
          .catch(() => '');

      if (
        !text.includes(
          COLUMN_NAME
        )
      ) {
        continue;
      }

      const dots =
        columnContainer.locator(
          threeDotsSelector
        );

      const dotsCount =
        await dots.count();

      for (
        let i = 0;
        i < dotsCount;
        i++
      ) {
        const candidate =
          dots.nth(i);

        if (
          await candidate
            .isVisible()
            .catch(() => false)
        ) {
          menuSvg =
            candidate;

          break;
        }
      }

      if (menuSvg) {
        break;
      }
    }

    if (!menuSvg) {
      throw new Error(
        'Не удалось найти SVG меню трёх точек внутри нужной колонки'
      );
    }

    console.log(
      '✅ Контейнер колонки найден'
    );

    await visualPause(1500);

    /*
     * ============================================================
     * 9. ОТКРЫВАЕМ МЕНЮ КОЛОНКИ
     * ============================================================
     */

    console.log(
      '\n⋯ Поиск меню колонки...'
    );

    const menuButton =
      menuSvg.locator(
        'xpath=ancestor::*[contains(@class,"cursor-pointer")][1]'
      );

    if (
      (await menuButton.count()) === 0
    ) {
      throw new Error(
        'Не найден кликабельный контейнер кнопки меню'
      );
    }

    console.log(
      '🖱️ Наведение на колонку...'
    );

    await columnContainer.hover();

    // Исходная функциональная задержка.
    await page.waitForTimeout(
      300
    );

    await visualPause(1200);

    console.log(
      '🖱️ Открытие меню колонки...'
    );

    await menuButton.click();

    const deleteTexts =
      page.getByText(
        'Удалить',
        {
          exact: true
        }
      );

    let deleteText = null;

    const MENU_TIMEOUT =
      5000;

    const menuStart =
      Date.now();

    while (
      Date.now() - menuStart <
      MENU_TIMEOUT
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

      await page.waitForTimeout(
        200
      );
    }

    if (!deleteText) {
      throw new Error(
        'Меню колонки не открылось: видимый пункт "Удалить" не появился'
      );
    }

    console.log(
      '✅ Меню колонки открыто'
    );

    // Оставляем меню открытым, чтобы его было видно.
    await visualPause(2000);

    /*
     * ============================================================
     * 10. КЛИКАЕМ "УДАЛИТЬ"
     * ============================================================
     */

    console.log(
      '\n🗑️ Поиск пункта "Удалить"...'
    );

    const deleteButton =
      deleteText.locator(
        'xpath=ancestor::div[contains(@class,"cursor-pointer")][1]'
      );

    if (
      (await deleteButton.count()) === 0
    ) {
      throw new Error(
        'Не удалось найти кликабельный пункт "Удалить"'
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

    /*
     * ============================================================
     * 11. ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ
     * ============================================================
     */

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
      '✅ Модальное окно подтверждения открыто'
    );

    // Модалку специально держим перед глазами подольше.
    await visualPause(2500);

    /*
     * ============================================================
     * 12. ПОДТВЕРЖДАЕМ + ЖДЁМ DELETE API
     * ============================================================
     */

    console.log(
      '\n📡 Подтверждаем удаление и ждём DELETE...'
    );

    const [
      deleteResponse
    ] = await Promise.all([
      page.waitForResponse(
        response => {
          const url =
            response.url();

          const method =
            response
              .request()
              .method();

          return (
            method === 'DELETE' &&
            /\/projects\/[^/]+\/stages\/[^/]+/.test(
              url
            )
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

    /*
     * ============================================================
     * 13. ПРОВЕРКА API
     * ============================================================
     */

    const deleteStatus =
      deleteResponse.status();

    const deleteUrl =
      deleteResponse.url();

    console.log(
      '\n🔍 Проверка DELETE запроса...'
    );

    console.log(
      `📡 URL API: ${deleteUrl}`
    );

    console.log(
      `📊 HTTP статус: ${deleteStatus}`
    );

    const urlMatch =
      deleteUrl.match(
        /\/projects\/([^/]+)\/stages\/([^/?]+)/
      );

    if (urlMatch) {
      console.log(
        `🆔 ID проекта: ${urlMatch[1]}`
      );

      console.log(
        `🆔 ID колонки: ${urlMatch[2]}`
      );
    }

    if (
      deleteStatus >= 200 &&
      deleteStatus < 300
    ) {
      console.log(
        '✅ Сервер успешно удалил колонку'
      );
    } else {
      throw new Error(
        `Сервер вернул HTTP ${deleteStatus} при удалении колонки`
      );
    }

    await visualPause(2000);

    /*
     * ============================================================
     * 14. ПРОВЕРЯЕМ ИСЧЕЗНОВЕНИЕ КОЛОНКИ
     * ============================================================
     */

    console.log(
      '\n🔍 Проверка удаления колонки с доски...'
    );

    try {
      await visibleColumnTitle.waitFor({
        state: 'hidden',
        timeout: 10000
      });

      console.log(
        `✅ Колонка "${COLUMN_NAME}" исчезла с доски`
      );

    } catch (error) {
      const remaining =
        page.getByText(
          COLUMN_NAME,
          {
            exact: true
          }
        );

      let stillVisible =
        false;

      const remainingCount =
        await remaining.count();

      for (
        let i = 0;
        i < remainingCount;
        i++
      ) {
        if (
          await remaining
            .nth(i)
            .isVisible()
            .catch(() => false)
        ) {
          stillVisible =
            true;

          break;
        }
      }

      if (stillVisible) {
        throw new Error(
          `Колонка "${COLUMN_NAME}" всё ещё отображается после успешного DELETE`
        );
      }

      console.log(
        `✅ Колонка "${COLUMN_NAME}" больше не отображается`
      );
    }

    // Показываем итоговое состояние доски.
    await visualPause(3000);

    /*
     * ============================================================
     * 15. СКРИНШОТ
     * ============================================================
     */

    await page.screenshot({
      path: 'column-deleted.png',
      fullPage: false
    });

    console.log(
      '📸 Скриншот сохранён: column-deleted.png'
    );

    console.log(
      '\n✨ Колонка успешно создана и удалена!'
    );

  } catch (error) {
    console.error(
      '\n❌ Ошибка при удалении колонки:',
      error.message
    );

    if (!page.isClosed()) {
      console.error(
        `📍 URL в момент ошибки: ${page.url()}`
      );

      // В видимом режиме оставляем проблемный экран
      // на несколько секунд.
      await visualPause(3000);

      try {
        await page.screenshot({
          path: 'column-delete-error.png',
          fullPage: true
        });

        console.log(
          '📸 Скриншот ошибки сохранён: column-delete-error.png'
        );

      } catch (e) {
        console.warn(
          '⚠️ Не удалось сохранить скриншот'
        );
      }

      try {
        const html =
          await page.content();

        require('fs')
          .writeFileSync(
            'column-delete-error.html',
            html
          );

        console.log(
          '📄 HTML страницы сохранён: column-delete-error.html'
        );

      } catch (e) {
        console.warn(
          '⚠️ Не удалось сохранить HTML'
        );
      }
    }

    throw error;

  } finally {
    if (
      browser.isConnected()
    ) {
      await browser.close();
    }

    console.log(
      '\nℹ️ Браузер закрыт'
    );
  }
}

deleteColumn()
  .then(() => {
    console.log(
      '\n✨ Тест удаления колонки завершён успешно'
    );
  })
  .catch(error => {
    console.error(
      '\n💥 Тест завершился с ошибкой:',
      error.message
    );

    process.exit(1);
  });