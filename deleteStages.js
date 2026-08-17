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

    await page.fill(
      '[name="email"]',
      USER_EMAIL
    );

    await page.fill(
      '[name="password"]',
      USER_PASSWORD
    );

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

    /*
     * ============================================================
     * 4. ЖДЁМ ЗАГРУЗКУ ДОСКИ
     * ============================================================
     */

    console.log(
      '\n⏳ Ожидание полной загрузки доски...'
    );

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

    await addColumnButton.click();

    console.log(
      '✅ Клик по "Добавить колонку" выполнен'
    );

    /*
     * Ищем появившееся поле для названия.
     */

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

    await columnInput.fill(
      COLUMN_NAME
    );

    console.log(
      `✅ Введено название: ${COLUMN_NAME}`
    );

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

    /*
     * В интерфейсе создание колонки
     * подтверждаем Enter.
     */

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

    /*
     * ============================================================
     * 8. ИЩЕМ КОНТЕЙНЕР ИМЕННО ЭТОЙ КОЛОНКИ
     * ============================================================
     */

    console.log(
      '\n🔎 Поиск контейнера колонки...'
    );

    /*
     * У заголовка колонки рядом находится SVG
     * с тремя точками.
     *
     * Поднимаемся вверх по DOM до контейнера,
     * который содержит:
     *
     * - название нашей колонки;
     * - SVG трёх точек.
     */

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

    /*
     * ============================================================
     * 9. ОТКРЫВАЕМ МЕНЮ КОЛОНКИ
     * ============================================================
     */

    console.log(
      '\n⋯ Поиск меню колонки...'
    );

    /*
     * У SVG кликабельным является родительский DIV
     * с cursor-pointer.
     */

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

    /*
     * Кнопка появляется при hover колонки.
     */

    await columnContainer.hover();

    await page.waitForTimeout(
      300
    );

    await menuButton.click();

    /*
     * Не считаем меню открытым только потому,
     * что click() прошёл.
     *
     * Проверяем, что реально появился
     * видимый пункт "Удалить".
     */

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

    /*
     * ============================================================
     * 10. КЛИКАЕМ "УДАЛИТЬ"
     * ============================================================
     */

    console.log(
      '\n🗑️ Поиск пункта "Удалить"...'
    );

    /*
     * Сам текст находится внутри:
     *
     * div.cursor-pointer
     *   div ... Удалить
     *
     * Поэтому кликаем не по текстовому div,
     * а по ближайшему cursor-pointer.
     */

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

    await deleteButton.click();

    console.log(
      '✅ Клик по "Удалить" выполнен'
    );

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
      /*
       * Дополнительная проверка:
       * возможно старый locator уже detached.
       */

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