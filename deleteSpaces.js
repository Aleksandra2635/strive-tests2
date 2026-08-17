const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();
const fs = require('fs');

async function deleteSpace() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const SPACE_NAME = 'Тестовое пространство';

  console.log('🚀 Запуск теста удаления пространства...');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`📦 Название пространства: ${SPACE_NAME}`);

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
    // ============================================================
    // 1. АВТОРИЗАЦИЯ
    // ============================================================

    console.log('\n🌐 Открытие страницы входа...');

    await page.goto(
      'https://app.striveapp.ru/login',
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }
    );

    await page.locator('[name="email"]').waitFor({
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

    // ============================================================
    // 2. ПОИСК НУЖНОГО ПРОСТРАНСТВА
    // ============================================================

    console.log(
      `\n📁 Поиск пространства "${SPACE_NAME}"...`
    );

    const spaceLinks = page.locator(
      'a[href^="/spaces/"]'
    );

    await spaceLinks.first().waitFor({
      state: 'visible',
      timeout: 20000
    });

    const spaceCount =
      await spaceLinks.count();

    console.log(
      `🔎 Найдено ссылок пространств: ${spaceCount}`
    );

    let targetSpace = null;

    for (
      let i = 0;
      i < spaceCount;
      i++
    ) {
      const candidate =
        spaceLinks.nth(i);

      const text =
        await candidate
          .innerText()
          .catch(() => '');

      const href =
        await candidate
          .getAttribute('href');

      console.log(
        `   🔗 ${href} | ${text.trim()}`
      );

      if (
        text.trim() === SPACE_NAME ||
        text.includes(SPACE_NAME)
      ) {
        targetSpace = candidate;
        break;
      }
    }

    if (!targetSpace) {
      throw new Error(
        `Пространство "${SPACE_NAME}" не найдено`
      );
    }

    const spaceHref =
      await targetSpace.getAttribute(
        'href'
      );

    if (!spaceHref) {
      throw new Error(
        'Не удалось получить ссылку пространства'
      );
    }

    const spaceIdMatch =
      spaceHref.match(
        /\/spaces\/(\d+)/
      );

    const spaceId =
      spaceIdMatch
        ? spaceIdMatch[1]
        : null;

    console.log(
      `✅ Пространство найдено: ${spaceHref}`
    );

    if (spaceId) {
      console.log(
        `🆔 ID пространства: ${spaceId}`
      );
    }

    // ============================================================
    // 3. ПЕРЕХОД В ПРОСТРАНСТВО
    // ============================================================

    console.log(
      '\n📁 Переход в тестовое пространство...'
    );

    await page.goto(
      new URL(
        spaceHref,
        'https://app.striveapp.ru'
      ).href,
      {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      }
    );

    await page.waitForURL(
      /\/spaces\/\d+\/projects/,
      {
        timeout: 20000
      }
    );

    console.log(
      '✅ Переход в пространство выполнен'
    );

    console.log(
      `📍 URL: ${page.url()}`
    );

    // ============================================================
    // 4. ЖДЁМ ЗАГРУЗКУ СТРАНИЦЫ
    // ============================================================

    console.log(
      '\n⏳ Ожидание полной загрузки пространства...'
    );

    /*
     * Ждём появления актуальной кнопки настроек.
     *
     * По диагностике:
     * SVG width=17 height=16 viewBox="0 0 17 16"
     * находится непосредственно внутри BUTTON.
     */

    const settingsSvg =
      page.locator(
        'button > svg[viewBox="0 0 17 16"]'
      );

    await settingsSvg.waitFor({
      state: 'visible',
      timeout: 30000
    });

    console.log(
      '✅ Пространство полностью загрузилось'
    );

    // ============================================================
    // 5. КНОПКА НАСТРОЕК ПРОСТРАНСТВА
    // ============================================================

    console.log(
      '\n⚙️ Поиск кнопки настроек пространства...'
    );

    const settingsButton =
      settingsSvg.locator('..');

    await settingsButton.waitFor({
      state: 'visible',
      timeout: 10000
    });

    console.log(
      '✅ Кнопка настроек найдена'
    );

    await settingsButton.click();

    console.log(
      '✅ Клик по кнопке настроек выполнен'
    );

    // ============================================================
    // 6. ОЖИДАНИЕ МЕНЮ НАСТРОЕК
    // ============================================================

    console.log(
      '\n📋 Ожидание меню пространства...'
    );

    /*
     * В диагностике текст "Настройки" уже присутствовал
     * в DOM, но был скрыт.
     *
     * После клика он должен стать visible.
     */

    const settingsTexts = [
      page.getByText(
        'Настройки пространства',
        {
          exact: true
        }
      ),

      page.getByText(
        'Настройки',
        {
          exact: true
        }
      )
    ];

    let settingsMenuItem = null;

    const menuStart =
      Date.now();

    while (
      Date.now() - menuStart <
      10000
    ) {
      for (
        const locator of settingsTexts
      ) {
        const count =
          await locator.count();

        for (
          let i = 0;
          i < count;
          i++
        ) {
          const candidate =
            locator.nth(i);

          if (
            await candidate
              .isVisible()
              .catch(() => false)
          ) {
            settingsMenuItem =
              candidate;

            break;
          }
        }

        if (settingsMenuItem) {
          break;
        }
      }

      if (settingsMenuItem) {
        break;
      }

      await page.waitForTimeout(
        200
      );
    }

    if (!settingsMenuItem) {
      throw new Error(
        'После клика не появился видимый пункт "Настройки"'
      );
    }

    console.log(
      '✅ Пункт настроек найден'
    );

    // ============================================================
    // 7. ПЕРЕХОД В НАСТРОЙКИ
    // ============================================================

    console.log(
      '\n⚙️ Переход в настройки пространства...'
    );

    /*
     * Если текст находится внутри button/div,
     * кликаем по ближайшему интерактивному родителю.
     */

    let settingsClickable =
      settingsMenuItem.locator(
        'xpath=ancestor::button[1]'
      );

    if (
      (await settingsClickable.count()) === 0
    ) {
      settingsClickable =
        settingsMenuItem.locator(
          'xpath=ancestor::*[contains(@class,"cursor-pointer")][1]'
        );
    }

    if (
      (await settingsClickable.count()) > 0
    ) {
      await settingsClickable.click();
    } else {
      await settingsMenuItem.click();
    }

    console.log(
      '✅ Клик по настройкам выполнен'
    );

    // ============================================================
    // 8. ЖДЁМ ОТКРЫТИЕ НАСТРОЕК
    // ============================================================

    console.log(
      '\n⏳ Ожидание открытия настроек...'
    );

    await page.waitForTimeout(1000);

    /*
     * Ищем кнопку "Удалить".
     * Здесь она должна находиться уже непосредственно
     * на странице/панели настроек пространства.
     */

    const deleteCandidates =
      page.getByRole(
        'button',
        {
          name: /^Удалить$/
        }
      );

    let deleteButton = null;

    const deleteSearchStart =
      Date.now();

    while (
      Date.now() -
        deleteSearchStart <
      15000
    ) {
      const count =
        await deleteCandidates.count();

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const candidate =
          deleteCandidates.nth(i);

        if (
          await candidate
            .isVisible()
            .catch(() => false)
        ) {
          deleteButton =
            candidate;

          break;
        }
      }

      if (deleteButton) {
        break;
      }

      /*
       * Возможно кнопка находится ниже.
       */

      await page.evaluate(() => {
        window.scrollTo(
          0,
          document.body.scrollHeight
        );

        document
          .querySelectorAll(
            '[class*="overflow"], [style*="overflow"]'
          )
          .forEach(el => {
            if (
              el.scrollHeight >
              el.clientHeight
            ) {
              el.scrollTop =
                el.scrollHeight;
            }
          });
      });

      await page.waitForTimeout(
        500
      );
    }

    /*
     * Резерв: если role=button отсутствует,
     * ищем любой видимый текст "Удалить".
     */

    if (!deleteButton) {
      console.warn(
        '⚠️ Button "Удалить" не найден по role, пробуем по тексту...'
      );

      const deleteTexts =
        page.getByText(
          'Удалить',
          {
            exact: true
          }
        );

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
          const parentButton =
            candidate.locator(
              'xpath=ancestor::button[1]'
            );

          if (
            (await parentButton.count()) >
            0
          ) {
            deleteButton =
              parentButton;

            break;
          }

          deleteButton =
            candidate;

          break;
        }
      }
    }

    if (!deleteButton) {
      throw new Error(
        'Не удалось найти кнопку "Удалить" в настройках пространства'
      );
    }

    console.log(
      '✅ Кнопка "Удалить" найдена'
    );

    // ============================================================
    // 9. КЛИК "УДАЛИТЬ"
    // ============================================================

    console.log(
      '\n🗑️ Нажатие на кнопку "Удалить"...'
    );

    await deleteButton.scrollIntoViewIfNeeded();

    await deleteButton.click();

    console.log(
      '✅ Клик по "Удалить" выполнен'
    );

    // ============================================================
    // 10. ПОДТВЕРЖДЕНИЕ
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
      '✅ Модальное окно подтверждения открыто'
    );

    // ============================================================
    // 11. ПОДТВЕРЖДАЕМ + ЖДЁМ PATCH
    // ============================================================

    console.log(
      '\n📡 Подтверждаем удаление и ждём PATCH...'
    );

    const [
      patchResponse
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
            method === 'PATCH' &&
            url.includes('/spaces/') &&
            url.includes('/archived')
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

    // ============================================================
    // 12. ПРОВЕРКА API
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

    const deletedSpaceId =
      apiUrl.match(
        /\/spaces\/(\d+)/
      );

    if (deletedSpaceId) {
      console.log(
        `🆔 ID удалённого пространства: ${deletedSpaceId[1]}`
      );
    }

    if (
      status >= 200 &&
      status < 300
    ) {
      console.log(
        '✅ Сервер успешно отправил пространство в корзину'
      );
    } else {
      throw new Error(
        `Сервер вернул HTTP ${status} при удалении пространства`
      );
    }

    // ============================================================
    // 13. ВОЗВРАЩАЕМСЯ НА MAIN
    // ============================================================

    console.log(
      '\n🏠 Возврат на главную страницу...'
    );

    await page.goto(
      'https://app.striveapp.ru/main',
      {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      }
    );

    // ============================================================
    // 14. ПРОВЕРЯЕМ ИСЧЕЗНОВЕНИЕ
    // ============================================================

    console.log(
      '\n🔍 Проверка исчезновения пространства...'
    );

    await page.waitForTimeout(
      1500
    );

    const remainingSpaces =
      page.locator(
        'a[href^="/spaces/"]'
      );

    const remainingCount =
      await remainingSpaces.count();

    let stillExists = false;

    for (
      let i = 0;
      i < remainingCount;
      i++
    ) {
      const text =
        await remainingSpaces
          .nth(i)
          .innerText()
          .catch(() => '');

      if (
        text.includes(SPACE_NAME)
      ) {
        stillExists = true;
        break;
      }
    }

    if (stillExists) {
      throw new Error(
        `Пространство "${SPACE_NAME}" всё ещё отображается после успешного PATCH`
      );
    }

    console.log(
      `✅ Пространство "${SPACE_NAME}" больше не отображается`
    );

    // ============================================================
    // 15. СКРИНШОТ
    // ============================================================

    await page.screenshot({
      path: 'space-deleted.png',
      fullPage: false
    });

    console.log(
      '📸 Скриншот сохранён: space-deleted.png'
    );

    console.log(
      '\n✨ Пространство успешно удалено!'
    );

  } catch (error) {
    console.error(
      '\n❌ Ошибка при удалении пространства:',
      error.message
    );

    if (!page.isClosed()) {
      console.error(
        `📍 URL в момент ошибки: ${page.url()}`
      );

      try {
        await page.screenshot({
          path: 'space-delete-error.png',
          fullPage: true
        });

        console.log(
          '📸 Скриншот ошибки сохранён: space-delete-error.png'
        );
      } catch (e) {
        console.warn(
          '⚠️ Не удалось сохранить скриншот'
        );
      }

      try {
        const html =
          await page.content();

        fs.writeFileSync(
          'space-delete-error.html',
          html
        );

        console.log(
          '📄 HTML страницы сохранён: space-delete-error.html'
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

deleteSpace()
  .then(() => {
    console.log(
      '\n✨ Тест удаления пространства завершён успешно'
    );
  })
  .catch(error => {
    console.error(
      '\n💥 Тест завершился с ошибкой:',
      error.message
    );

    process.exit(1);
  });