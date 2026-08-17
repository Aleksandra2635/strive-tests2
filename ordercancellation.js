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
    `🖥️ Режим браузера: ${browserOptions.headless ? 'headless' : 'видимый'}`
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
    // 1️⃣ Открытие страницы входа
    console.log('🌐 Открытие страницы входа...');

    await page.goto('https://app.striveapp.ru/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('✅ Страница входа загружена');

    // 2️⃣ Ожидание поля email
    console.log('⏳ Ожидание поля ввода email...');

    await page.locator('[name="email"]').waitFor({
      state: 'visible',
      timeout: 30000
    });

    // 3️⃣ Ввод данных
    console.log('📝 Ввод email...');

    await page.fill(
      '[name="email"]',
      USER_EMAIL
    );

    console.log('📝 Ввод пароля...');

    await page.fill(
      '[name="password"]',
      USER_PASSWORD
    );

    // 4️⃣ Вход
    console.log('🖱️ Нажатие кнопки "Продолжить"...');

    await page.locator(
      'button[type="submit"]'
    ).click();

    console.log('⏳ Ожидание завершения входа...');

    await page.waitForURL(
      /\/main|\/dashboard|\/workspace/,
      {
        timeout: 45000
      }
    );

    console.log('✅ Вход успешно выполнен!');
    console.log(`🏠 Текущий URL: ${page.url()}`);

    // 5️⃣ Переход в "Моя организация"
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

    await page.waitForURL(
      '**/admin-panel',
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

    // 6️⃣ Переход в "Оплата и тарифы"
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

    await page.waitForURL(
      '**/admin-panel/tarif',
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

    // 7️⃣ Отмена заказа
    console.log(
      '\n🔄 Начало процесса отмены заказа...'
    );

    // 7.1 Нажатие "Отменить заказ"
    console.log(
      '🗑️ Поиск кнопки "Отменить заказ"...'
    );

    const cancelOrderButton = page.getByRole(
      'button',
      {
        name: 'Отменить заказ'
      }
    );

    await cancelOrderButton.waitFor({
      state: 'visible',
      timeout: 15000
    });

    await cancelOrderButton.click();

    console.log(
      '✅ Клик по "Отменить заказ" выполнен'
    );

    // 7.2 Ввод причины отмены
    console.log(
      '\n📝 Ввод причины отмены...'
    );

    const reasonInput = page.locator(
      'textarea[placeholder="Введите причину отмены"]'
    );

    await reasonInput.waitFor({
      state: 'visible',
      timeout: 10000
    });

    await reasonInput.fill(
      'Strive Test'
    );

    console.log(
      '✅ Введена причина: Strive Test'
    );

    // 7.3 Нажатие "Сохранить"
    console.log(
      '\n💾 Нажатие кнопки "Сохранить"...'
    );

    const saveButton = page.getByRole(
      'button',
      {
        name: 'Сохранить'
      }
    );

    await saveButton.waitFor({
      state: 'visible',
      timeout: 10000
    });

    await saveButton.click();

    console.log(
      '✅ Клик по "Сохранить" выполнен'
    );

    // Даём интерфейсу обработать отмену
    await page.waitForTimeout(2000);

    // 8️⃣ Скриншот подтверждения
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

  } catch (error) {
    console.error(
      '❌ Ошибка при выполнении теста:',
      error.message
    );

    console.error(
      `📍 URL в момент ошибки: ${page.url()}`
    );

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