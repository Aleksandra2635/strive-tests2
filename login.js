const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function login_oplata_Test() {
  // Загрузка переменных из .env
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;

  console.log('🚀 Запуск теста входа...');
  console.log(`📧 Email: ${USER_EMAIL}`);

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


  try {
    // 1️⃣ Открытие страницы входа
    console.log('🌐 Открытие страницы входа...');
    await page.goto('https://app.striveapp.ru/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    console.log('✅ Страница входа загружена');

    // 2️⃣ Ожидание появления поля email
    console.log('⏳ Ожидание поля ввода email...');
    await page.waitForSelector('[name="email"]', { 
      state: 'visible', 
      timeout: 30000 
    });

    // 3️⃣ Ввод данных
    console.log('📝 Ввод email...');
    await page.fill('[name="email"]', USER_EMAIL);
    
    console.log('📝 Ввод пароля...');
    await page.fill('[name="password"]', USER_PASSWORD);

    // 4️⃣ Клик по кнопке "Продолжить"
    console.log('🖱️ Нажатие кнопки "Продолжить"...');
    await page.waitForSelector('button[type="submit"]', { 
      state: 'visible', 
      timeout: 15000 
    });
    await page.click('button[type="submit"]');

        // 5️⃣ Ожидание успешного входа
        console.log('⏳ Ожидание завершения входа...');
        
        // Ждём появления элементов главной страницы
        await page.waitForURL(/(\/main|\/dashboard|\/workspace)/, { timeout: 45000 });
        console.log('✅ Вход успешно выполнен!');
        console.log(`🏠 Текущий URL: ${page.url()}`);
      } catch (error) {
        console.error('❌ Ошибка при входе:', error.message);
        
        // Сохраняем скриншот для отладки
        try {
          await page.screenshot({ path: 'login-error.png' });
          console.log('📸 Скриншот ошибки сохранён: login-error.png');
        } catch (e) {
          console.warn('⚠️ Не удалось сохранить скриншот');
        }
        
        // ВАЖНО: ПРОБРАСЫВАЕМ ОШИБКУ, чтобы она попала в отчёт!
        throw error;
      } finally {
        await context.close();
        await browser.close();
      }
    }

// ЭКСПОРТИРУЕМ функцию для run-all-tests.js
module.exports = login_oplata_Test;

// Обработка изолированного запуска
if (require.main === module) {
  login_oplata_Test()
    .then(() => {
      console.log('\n✨ Тест входа завершён успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Тест входа завершился с ошибкой:', error.message);
      process.exit(1); // ← КОД ОШИБКИ для корректного отображения в отчёте
    });
}