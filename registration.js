const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
const EmailReader = require('./emailReader');
require('dotenv').config();

async function registration() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const USER_PHONE = process.env.USER_PHONE;
  const USER_EMAIL_PASSWORD = process.env.USER_EMAIL_PASSWORD;
  const EMAIL_HOST = USER_EMAIL.includes('yandex') ? 'imap.yandex.ru' : 'imap.mail.ru';

  console.log('🚀 Запуск регистрации...');
  console.log(`📧 Почта: ${USER_EMAIL}`);
  console.log(`📱 Телефон: ${USER_PHONE}`);
  console.log(`🌐 IMAP хост: ${EMAIL_HOST}`);

  const browserOptions = getBrowserOptions();
  console.log(`🖥️ Режим браузера: ${browserOptions.headless ? 'headless' : 'видимый'}`);
  
  const browser = await chromium.launch(browserOptions);
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // 1. Открытие регистрации
    console.log('🌐 Открытие страницы регистрации...');
    try {
      await page.goto('http://app.striveapp.ru/create-account?metrics=false', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      console.log('✅ Страница загружена');
    } catch (error) {
      console.warn('⚠️ Ошибка при загрузке страницы:', error.message);
      console.log('🔄 Попытка повторной загрузки...');
      await page.goto('http://app.striveapp.ru/create-account?metrics=false', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
    }

    const title = await page.title();
    console.log(`📄 Заголовок страницы: ${title}`);

    await page.evaluate(() => {
      localStorage.setItem('projectOnboarding', 'passed');
    });

    // 2. Ввод данных
    console.log('📝 Ввод email, телефона и пароля...');
    await page.fill('[name="email"]', USER_EMAIL); 
    await page.fill('[name="password"]', USER_PASSWORD);
    await page.fill('[name="phone"]', USER_PHONE);
    await page.click('[type="submit"]');

    // 3. Ожидание и получение кода
    console.log('⏳ Ожидание кода подтверждения из почты...');
    console.log('⏱️ Ждём 6 секунд, чтобы сервер успел отправить письмо...');
    await page.waitForTimeout(6000);
    
    const emailReader = new EmailReader(EMAIL_HOST, USER_EMAIL, USER_EMAIL_PASSWORD);
    const confirmationCode = await emailReader.getConfirmationCode();

    // 4. Ввод кода посимвольно
    console.log(`🔢 Ввод кода ${confirmationCode} посимвольно...`);
    await page.fill('input[type="text"][maxlength="1"]:nth-of-type(1)', confirmationCode[0]);
    await page.fill('input[type="text"][maxlength="1"]:nth-of-type(2)', confirmationCode[1]);
    await page.fill('input[type="text"][maxlength="1"]:nth-of-type(3)', confirmationCode[2]);
    await page.fill('input[type="text"][maxlength="1"]:nth-of-type(4)', confirmationCode[3]);

    console.log('✅ Код успешно введен. Ожидание перехода к следующему шагу...');

    // 5. Онбординг: Тип организации
    await page.waitForSelector('button:has-text("В компании / организации")', { timeout: 15000 });
    console.log('🏢 Выбор: В компании / организации');
    await page.locator('button:has-text("В компании / организации")').click();

    console.log('➡️ Клик по кнопке "Далее" (шаг 1)');
    await page.locator('button:has-text("Далее")').first().click();
    await page.waitForTimeout(1000);

    // 6. Онбординг: Размер компании
    console.log('👥 Выбор: 10–50 человек');
    await page.locator('button:has-text("10–50 человек")').click();

    console.log('➡️ Финальный клик по кнопке "Далее" (шаг 2)');
    await page.locator('button:has-text("Далее")').first().click();
    await page.waitForTimeout(800);

    // 7. Онбординг: Название компании
    console.log('🏢 Ожидание поля ввода названия компании...');
    await page.waitForSelector('#organization-name', { timeout: 15000 });
    console.log('⌨️ Ввод названия компании: "Strive Test"');
    await page.fill('#organization-name', 'Strive Test');

    console.log('➡️ Клик по кнопке "Далее" (шаг 3)');
    await page.locator('button:has-text("Далее")').first().click();
    await page.waitForTimeout(800);

    // 8. Онбординг: Сфера деятельности
    console.log('🔘 Ожидание и выбор варианта: "Другое"');
    await page.waitForSelector('button:has-text("Другое")', { timeout: 15000 });
    await page.locator('button:has-text("Другое")').click();

    console.log('➡️ Клик по кнопке "Далее" (шаг 4)');
    await page.locator('button:has-text("Далее")').first().click();
    await page.waitForTimeout(800);

    // 9. Онбординг: Встреча
    console.log('📅 Ожидание и выбор варианта: "Да, запишите на встречу"');
    await page.waitForSelector('button:has-text("Да, запишите на встречу")', { timeout: 15000 });
    await page.locator('button:has-text("Да, запишите на встречу")').click();

    // 10. ПЕРЕХВАТ И ПРОВЕРКА API ЗАПРОСА
    console.log('🌐 Установка перехвата API запроса: POST /contact/request');
    
    const apiResponsePromise = page.waitForResponse(
      response => 
        response.url() === 'https://server.striveapp.ru/contact/request' && 
        response.request().method() === 'POST',
      { timeout: 15000 }
    );

    console.log('🏁 Клик по кнопке "Завершить"');
    await page.locator('button:has-text("Завершить")').first().click();

    const apiResponse = await apiResponsePromise;

    // 11. Проверка ответа API и редиректа
    if (apiResponse.ok()) {
      console.log(`✅ API запрос успешен! Статус: ${apiResponse.status()}`);
      
      try {
        const responseData = await apiResponse.json();
        console.log('📦 Ответ сервера:', JSON.stringify(responseData, null, 2));
      } catch (e) {
        console.log('⚠️ Ответ сервера не является JSON (или пустой)');
      }

      console.log('🔗 Ожидание редиректа на панель организации...');
      await page.waitForURL('**/admin-panel/organization', { timeout: 15000 });
      
      const currentUrl = page.url();
      console.log(`✅ Успешный переход! Текущий URL: ${currentUrl}`);

      console.log('🎉 Сценарий регистрации полностью завершен!');
      
    } else {
      console.error(`❌ Ошибка API запроса! Статус: ${apiResponse.status()}`);
      const errorText = await apiResponse.text();
      console.error('📄 Текст ошибки:', errorText);
      throw new Error(`API вернул ошибку: ${apiResponse.status()}`);
    }

  } catch (error) {
    console.error('❌ Критическая ошибка в процессе регистрации:', error.message);
    // Вызов sendError удален, чтобы избежать ошибки "is not defined"
    throw error; // Пробрасываем ошибку дальше, чтобы сработал process.exit(1)
  } finally {
    console.log('🛑 Закрытие браузера...');
    await browser.close();
  }
}

// Запуск теста
registration()
  .then(() => {
    console.log('\n✨ Тест регистрации завершён успешно');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });