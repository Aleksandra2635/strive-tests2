const { sendSuccess, sendError } = require('./telegram');
const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
const EmailReader = require('./emailReader');
require('dotenv').config();

async function registration() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const USER_EMAIL_PASSWORD = process.env.USER_EMAIL_PASSWORD;
  const EMAIL_HOST = USER_EMAIL.includes('yandex') ? 'imap.yandex.ru' : 'imap.mail.ru';

  console.log('🚀 Запуск регистрации...');
  console.log(`📧 Почта: ${USER_EMAIL}`);
  console.log(`🌐 IMAP хост: ${EMAIL_HOST}`);

 // Запуск браузера с конфигом
  const browserOptions = getBrowserOptions(); // ← Получаем опции
  console.log(`🖥️ Режим браузера: ${browserOptions.headless ? 'headless' : 'видимый'}`);
  
  const browser = await chromium.launch(browserOptions); // ← Используем опции
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 } // ← Добавляем размер окна
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(60000); // 60 секунд

  
  // ⚠️ ДОБАВЛЕН БЛОК TRY ЗДЕСЬ ⚠️
  try {
    // 1. Открытие регистрации
    console.log('🌐 Открытие страницы регистрации...');
    console.log('⏳ Это может занять некоторое время...');
    
    // Попытка открыть страницу с обработкой ошибок
    try {
      await page.goto('http://app.striveapp.ru/create-account?metrics=false', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      console.log('✅ Страница загружена');
    } catch (error) {
      console.warn('⚠️ Ошибка при загрузке страницы:', error.message);
      console.log('🔄 Попытка повторной загрузки...');
      
      // Вторая попытка
      await page.goto('http://app.striveapp.ru/create-account?metrics=false', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
    }


    // Проверка доступности страницы
    const title = await page.title();
    console.log(`📄 Заголовок страницы: ${title}`);

    await page.evaluate(() => {
      localStorage.setItem('projectOnboarding', 'passed');
    });

    // 2. Ввод данных
    console.log('📝 Ввод email и пароля...');
    await page.fill('[name="email"]', USER_EMAIL);
    await page.fill('[name="password"]', USER_PASSWORD);
    await page.click('[type="submit"]');

    // 3. Ожидание и получение кода
    console.log('⏳ Ожидание кода подтверждения из почты...');
    // ДОБАВЛЕНА ЗАДЕРЖКА: даём серверу время отправить письмо
    console.log('⏱️  Ждём 6 секунд, чтобы сервер успел отправить письмо...');
    await page.waitForTimeout(6000)
    const emailReader = new EmailReader(EMAIL_HOST, USER_EMAIL, USER_EMAIL_PASSWORD);
    const confirmationCode = await emailReader.getConfirmationCode();

    // 4. Ввод кода посимвольно в 4 поля
console.log(`🔢 Ввод кода ${confirmationCode} посимвольно...`);

// Ввод каждого символа в соответствующее поле
await page.fill('input[type="text"][maxlength="1"]:nth-of-type(1)', confirmationCode[0]);
await page.fill('input[type="text"][maxlength="1"]:nth-of-type(2)', confirmationCode[1]);
await page.fill('input[type="text"][maxlength="1"]:nth-of-type(3)', confirmationCode[2]);
await page.fill('input[type="text"][maxlength="1"]:nth-of-type(4)', confirmationCode[3]);

    // 5. Установка имени
    console.log('👤 Установка имени пользователя...');
    await page.waitForSelector('[data-testid="name"]', { timeout: 15000 });
    await page.fill('[data-testid="name"]', 'Strive Test');
    await page.click('button.inline-flex:has-text("Продолжить")');

   console.log('📱 Установка номера телефона...');
    await page.waitForSelector('input[name="phone"]', { timeout: 15000 });
    await page.fill('input[name="phone"]', '+79999999999');

    // 7. Клик на кнопку "10-50"
    console.log('🔘 Клик на кнопку диапазона...');
    await page.waitForSelector('button[type="button"]:has-text("10-50")', { timeout: 15000 });
    await page.click('button[type="button"]:has-text("10-50")');
    await page.click('button.inline-flex:has-text("Продолжить")');

    console.log('🔍 Проверка перехода на главную страницу...');
    await page.waitForURL('https://app.striveapp.ru/admin-panel/organization', { timeout: 15000 });
    console.log('✅ Успешно перешли на главную страницу!');

     
    console.log('✅ Регистрация успешно завершена!');
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('❌ Ошибка регистрации:', error.message);
    console.error('📝 Полная ошибка:', error);
    
    // Сохраняем скриншот для отладки
    try {
      await page.screenshot({ path: 'error.png' });
      console.log('📸 Скриншот ошибки сохранён: error.png');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить скриншот');
    }
    
    // Сохраняем HTML страницы
    try {
      const html = await page.content();
      require('fs').writeFileSync('error.html', html);
      console.log('📄 HTML страницы сохранён: error.html');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить HTML');
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

registration()
  .then(() => {
    console.log('\n✨ Тест регистрации завершён успешно');
  })
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });