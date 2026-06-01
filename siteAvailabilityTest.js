const { chromium } = require('playwright');
const { sendSuccess, sendError } = require('./telegram');
const { getBrowserOptions } = require('./browserConfig');

async function siteAvailabilityTest() {
  console.log('🌐 Запуск теста доступности сайта...');
  
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
    // Открытие сайта
    console.log('🌐 Открытие сайта https://striveapp.ru/...');
    await page.goto('https://striveapp.ru/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    console.log('✅ Сайт загружен');

    // Проверка статуса ответа
    const response = await page.goto('https://striveapp.ru/', {
      waitUntil: 'domcontentloaded'
    });
    
    if (!response) {
      throw new Error('Не удалось получить ответ от сервера');
    }
    
    const status = response.status();
    console.log(`📊 HTTP статус: ${status}`);
    
    if (status !== 200) {
      throw new Error(`Сайт вернул статус ${status} вместо 200`);
    }

    // Проверка текущего URL
    const currentUrl = page.url();
    console.log(`📍 Текущий URL: ${currentUrl}`);
    
    if (!currentUrl.includes('striveapp.ru')) {
      throw new Error(`Неверный URL: ${currentUrl}`);
    }

    // Проверка наличия заголовка страницы
    const title = await page.title();
    console.log(`📄 Заголовок страницы: ${title}`);
    
    if (!title || title.length === 0) {
      throw new Error('Заголовок страницы пустой');
    }

    // Проверка, что страница не пустая
    const bodyText = await page.textContent('body');
    if (!bodyText || bodyText.length < 100) {
      throw new Error('Страница пустая или содержит слишком мало контента');
    }

    console.log('✅ Сайт доступен!');
    
    


  } catch (error) {
    console.error('❌ Ошибка при проверке сайта:', error.message);
    
    // Сохраняем скриншот ошибки
    try {
      await page.screenshot({ path: 'site-error.png' });
      console.log('📸 Скриншот ошибки сохранён: site-error.png');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить скриншот');
    }
    
    
    
    throw error;
  } finally {
    await browser.close();
    console.log('ℹ️ Браузер закрыт');
  }
}

// Запуск теста
siteAvailabilityTest()
  .then(() => console.log('\n✨ Тест доступности сайта завершён успешно'))
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });