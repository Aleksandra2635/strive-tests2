const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function login_oplata_Test() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;

  console.log('🚀 Запуск теста входа...');
  console.log(`📧 Email: ${USER_EMAIL}`);

  const browserOptions = getBrowserOptions();
  console.log(
    `🖥️ Режим браузера: ${browserOptions.headless ? 'headless' : 'видимый'}`
  );

  const browser = await chromium.launch(browserOptions);

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // 1. Открытие страницы входа
    console.log('🌐 Открытие страницы входа...');

    await page.goto('https://app.striveapp.ru/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('✅ Страница входа загружена');

    // 2. Ввод email
    console.log('⏳ Ожидание поля ввода email...');

    await page.locator('[name="email"]').waitFor({
      state: 'visible',
      timeout: 30000
    });

    console.log('📝 Ввод email...');
    await page.fill('[name="email"]', USER_EMAIL);

    // 3. Ввод пароля
    console.log('📝 Ввод пароля...');
    await page.fill('[name="password"]', USER_PASSWORD);

    // 4. Вход
    console.log('🖱️ Нажатие кнопки "Продолжить"...');

    await page.locator('button[type="submit"]').click();

    console.log('⏳ Ожидание завершения входа...');

    await page.waitForURL(/\/main|\/dashboard|\/workspace/, {
      timeout: 45000
    });

    console.log('✅ Вход успешно выполнен!');
    console.log(`🏠 Текущий URL: ${page.url()}`);

    // 5. Переход в "Моя организация"
    console.log('\n🏢 Переход в раздел "Моя организация"...');

    await page.goto('https://app.striveapp.ru/admin-panel', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForURL('**/admin-panel', {
      timeout: 20000
    });

    console.log('✅ Страница "Моя организация" загружена!');
    console.log(`📍 URL: ${page.url()}`);

    // 6. Переход в "Оплата и тарифы"
    console.log('\n💳 Переход в раздел "Оплата и тарифы"...');

    await page.goto('https://app.striveapp.ru/admin-panel/tarif', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForURL('**/admin-panel/tarif', {
      timeout: 20000
    });

    console.log('✅ Страница "Оплата и тарифы" загружена!');
    console.log(`📍 URL: ${page.url()}`);

    // 7. Поиск тарифа
    console.log(
      '\n🎯 Поиск тарифа "Оптимальный тариф для команд до 15 человек"...'
    );

    const tariffText = page.getByText(
      'Оптимальный тариф для команд до 15 человек',
      { exact: true }
    );

    await tariffText.waitFor({
      state: 'visible',
      timeout: 15000
    });

    console.log('✅ Тариф найден');

    // 8. Поиск кнопки "Подключить тариф"
    console.log('🔍 Поиск кнопки "Подключить тариф"...');

    const tariffContainer = tariffText.locator('..').locator('..');

    let connectButton = tariffContainer.getByRole('button', {
      name: 'Подключить тариф'
    });

    if (!(await connectButton.count())) {
      connectButton = page.getByRole('button', {
        name: 'Подключить тариф'
      }).first();
    }

    await connectButton.waitFor({
      state: 'visible',
      timeout: 15000
    });

    await connectButton.click();

    console.log('✅ Клик по "Подключить тариф" выполнен');

    // 9. Модальное окно
    console.log('\n🪟 Ожидание модального окна...');

    const purchaseButton = page.getByRole('button', {
      name: 'Перейти к покупке'
    });

    await purchaseButton.waitFor({
      state: 'visible',
      timeout: 15000
    });

    console.log('✅ Модальное окно открыто');

    await purchaseButton.click();

    console.log('✅ Клик по "Перейти к покупке" выполнен');

    // 10. Номер телефона
    console.log('\n📱 Ввод российского номера телефона...');

    const phoneInput = page.locator('input[name="phone"]');

    await phoneInput.waitFor({
      state: 'visible',
      timeout: 10000
    });

    const russianPhone = '9999999999';

    await phoneInput.fill(russianPhone);

    console.log(`✅ Введен номер телефона: ${russianPhone}`);

    // 11. Оформление заказа
    console.log('\n📦 Оформление заказа...');

    const orderButton = page.getByRole('button', {
      name: 'Оформить заказ'
    });

    await orderButton.waitFor({
      state: 'visible',
      timeout: 10000
    });

    await orderButton.click();

    console.log('✅ Клик по "Оформить заказ" выполнен');

    // 12. Проверка YooMoney
    console.log('\n💳 Проверка перехода на YooMoney...');

    await page.waitForURL(
      /yoomoney\.ru\/checkout\/payments\/v2\/contract/,
      {
        timeout: 30000
      }
    );

    console.log('✅ Переход на страницу оплаты выполнен!');
    console.log(`📍 URL страницы оплаты: ${page.url()}`);

    // 13. Скриншот
    await page.screenshot({
      path: 'payment-page.png',
      fullPage: true
    });

    console.log('📸 Скриншот сохранён: payment-page.png');

  } catch (error) {
    console.error(
      '❌ Ошибка при выполнении теста:',
      error.message
    );

    console.error(`📍 URL в момент ошибки: ${page.url()}`);

    try {
      await page.screenshot({
        path: 'error.png',
        fullPage: true
      });

      console.log('📸 Скриншот ошибки сохранён: error.png');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить скриншот');
    }

    try {
      const html = await page.content();

      require('fs').writeFileSync(
        'error.html',
        html
      );

      console.log('📄 HTML страницы сохранён: error.html');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить HTML');
    }

    throw error;

  } finally {
    await browser.close();
    console.log('\nℹ️ Браузер закрыт');
  }
}

login_oplata_Test()
  .then(() => {
    console.log('\n✨ Тест входа и оплаты завершён успешно');
  })
  .catch(error => {
    console.error(
      '\n💥 Тест завершился с ошибкой:',
      error.message
    );

    process.exit(1);
  });