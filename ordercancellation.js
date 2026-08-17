const { chromium } = require('playwright');
const { sendSuccess, sendError } = require('./telegram');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function ordercancellation() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;

  console.log('🚀 Запуск теста отмены заказа...');
  console.log(`📧 Email: ${USER_EMAIL}`);

  const browserOptions = getBrowserOptions();

  console.log(
    `🖥️ Режим браузера: ${
      browserOptions.headless ? 'headless' : 'видимый'
    }`
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

  try {
    // 1. Открытие страницы входа
    console.log('\n🌐 Открытие страницы входа...');

    await page.goto(
      'https://app.striveapp.ru/login',
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }
    );

    console.log(
      '✅ Страница входа загружена'
    );

    await visualPause(1000);

    // 2. Email
    console.log(
      '⏳ Ожидание поля ввода email...'
    );

    await page
      .locator('[name="email"]')
      .waitFor({
        state: 'visible',
        timeout: 30000
      });

    console.log(
      '📝 Ввод email...'
    );

    await page.fill(
      '[name="email"]',
      USER_EMAIL
    );

    await visualPause(500);

    // 3. Пароль
    console.log(
      '📝 Ввод пароля...'
    );

    await page.fill(
      '[name="password"]',
      USER_PASSWORD
    );

    await visualPause(1000);

    // 4. Вход
    console.log(
      '🖱️ Нажатие кнопки "Продолжить"...'
    );

    await page
      .locator('button[type="submit"]')
      .click();

    console.log(
      '⏳ Ожидание завершения входа...'
    );

    await page.waitForURL(
      /\/main|\/dashboard|\/workspace/,
      {
        timeout: 45000
      }
    );

    console.log(
      '✅ Вход успешно выполнен!'
    );

    console.log(
      `🏠 Текущий URL: ${page.url()}`
    );

    await visualPause(1500);

    // 5. Моя организация
    console.log(
      '\n🏢 Переход в раздел "Моя организация"...'
    );

    await page.goto(
      'https://app.striveapp.ru/admin-panel',
      {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      }
    );

    /*
     * Сейчас приложение редиректит:
     *
     * /admin-panel
     * →
     * /admin-panel?attempt=1
     * →
     * /admin-panel/organization?attempt=1
     *
     * Поэтому ждём конечный URL организации,
     * а query-параметры разрешаем.
     */
    await page.waitForURL(
      /\/admin-panel\/organization(?:\?.*)?$/,
      {
        timeout: 20000
      }
    );

    console.log(
      '✅ Страница "Моя организация" загружена!'
    );

    console.log(
      `📍 URL: ${page.url()}`
    );

    await visualPause(2000);

    // 6. Оплата и тарифы
    console.log(
      '\n💳 Переход в раздел "Оплата и тарифы"...'
    );

    await page.goto(
      'https://app.striveapp.ru/admin-panel/tarif',
      {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      }
    );

    /*
     * Аналогично разрешаем query-параметры.
     */
    await page.waitForURL(
      /\/admin-panel\/tarif(?:\?.*)?$/,
      {
        timeout: 20000
      }
    );

    console.log(
      '✅ Страница "Оплата и тарифы" загружена!'
    );

    console.log(
      `📍 URL: ${page.url()}`
    );

    await visualPause(2000);

    // 7. Отмена заказа
    console.log(
      '\n🔄 Начало процесса отмены заказа...'
    );

    // 7.1 Кнопка "Отменить заказ"
    console.log(
      '🗑️ Поиск кнопки "Отменить заказ"...'
    );

    const cancelOrderButton =
      page.getByRole(
        'button',
        {
          name: 'Отменить заказ',
          exact: true
        }
      );

    await cancelOrderButton.waitFor({
      state: 'visible',
      timeout: 15000
    });

    console.log(
      '✅ Кнопка "Отменить заказ" найдена'
    );

    await visualPause(1500);

    console.log(
      '🖱️ Нажатие "Отменить заказ"...'
    );

    await cancelOrderButton.click();

    console.log(
      '✅ Клик по "Отменить заказ" выполнен'
    );

    await visualPause(2000);

    // 7.2 Причина отмены
    console.log(
      '\n📝 Ввод причины отмены...'
    );

    const reasonInput =
      page.locator(
        'textarea[placeholder="Введите причину отмены"]'
      );

    await reasonInput.waitFor({
      state: 'visible',
      timeout: 10000
    });

    console.log(
      '✅ Поле причины отмены найдено'
    );

    await visualPause(1000);

    console.log(
      '⌨️ Ввод причины: "Strive Test"'
    );

    await reasonInput.fill(
      'Strive Test'
    );

    console.log(
      '✅ Введена причина: Strive Test'
    );

    await visualPause(2000);

    // 7.3 Сохранить
    console.log(
      '\n💾 Нажатие кнопки "Сохранить"...'
    );

    const saveButton =
      page.getByRole(
        'button',
        {
          name: 'Сохранить',
          exact: true
        }
      );

    await saveButton.waitFor({
      state: 'visible',
      timeout: 10000
    });

    console.log(
      '✅ Кнопка "Сохранить" найдена'
    );

    await visualPause(2500);

    console.log(
      '🖱️ Подтверждение отмены заказа...'
    );

    await saveButton.click();

    console.log(
      '✅ Клик по "Сохранить" выполнен'
    );

    // Даём интерфейсу обработать отмену.
    await page.waitForTimeout(2000);

    await visualPause(2000);

    // 8. Скриншот
    await page.screenshot({
      path: 'cancellation-confirmation.png',
      fullPage: true
    });

    console.log(
      '📸 Скриншот сохранён: cancellation-confirmation.png'
    );

    console.log(
      '\n✅ Отмена заказа выполнена'
    );

    await visualPause(3000);

  } catch (error) {
    console.error(
      '\n❌ Ошибка при выполнении теста:',
      error.message
    );

    if (!page.isClosed()) {
      console.error(
        `📍 URL в момент ошибки: ${page.url()}`
      );

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
        const html =
          await page.content();

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

ordercancellation()
  .then(() => {
    console.log(
      '\n✨ Тест отмены заказа завершён успешно'
    );
  })
  .catch(error => {
    console.error(
      '\n💥 Тест завершился с ошибкой:',
      error.message
    );

    process.exit(1);
  });