const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function createProject() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const PROJECT_NAME = 'Тестовый проект';

  console.log('🚀 Запуск теста создания проекта...');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`📦 Название проекта: ${PROJECT_NAME}`);

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
    // 1️⃣ Вход в систему
    console.log('\n🌐 Открытие страницы входа...');
    await page.goto('https://app.striveapp.ru/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForSelector('[name="email"]', { state: 'visible', timeout: 30000 });
    await page.fill('[name="email"]', USER_EMAIL);
    await page.fill('[name="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');

    console.log('⏳ Ожидание успешного входа...');
    await page.waitForURL(/(\/main|\/dashboard|\/workspace)/, { timeout: 45000 });
    console.log('✅ Вход выполнен!');

   // 2️⃣ Переход в пространство
console.log('\n📁 Переход в пространство...');

try {
  // Поиск по XPath
  console.log('🔍 Поиск пространства по XPath...');
  await page.waitForSelector('xpath=/html/body/div[1]/div[1]/section/aside/div[1]/div[2]/div[2]/div[1]/div/div[2]/a[1]/div/div[2]', {
    state: 'visible',
    timeout: 15000
  });
  await page.click('xpath=/html/body/div[1]/div[1]/section/aside/div[1]/div[2]/div[2]/div[1]/div/div[2]/a[1]/div/div[2]');
  console.log('✅ Клик по пространству (XPath) выполнен');
  
} catch (err) {
  console.warn('⚠️ Не найдено по XPath, пробуем по тексту...');
}

    // Ожидание загрузки страницы пространства
    await page.waitForURL(/\/spaces\/\d+\/projects/, { timeout: 15000 });
    console.log(`📍 URL пространства: ${page.url()}`);

    // 3️⃣ Нажатие на кнопку "Добавить проект"
    console.log('\n➕ Нажатие на кнопку "Добавить проект"...');
    
    try {
      await page.waitForSelector('span:has-text("Добавить проект")', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('span:has-text("Добавить проект")');
      console.log('✅ Клик по "Добавить проект" выполнен');
      
    } catch (err) {
      console.warn('⚠️ Не найдено по тексту, пробуем по классу...');
      
      await page.waitForSelector('.font-bold.text-\\[14px\\].text-\\[\\#111012\\]', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('.font-bold.text-\\[14px\\].text-\\[\\#111012\\]');
      console.log('✅ Клик по "Добавить проект" (по классу) выполнен');
    }

    // 4️⃣ Нажатие на кнопку "Пустой проект"
    console.log('\n📄 Нажатие на кнопку "Пустой проект"...');
    
    try {
      await page.waitForSelector('p:has-text("Пустой проект")', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('p:has-text("Пустой проект")');
      console.log('✅ Клик по "Пустой проект" выполнен');
      
    } catch (err) {
      console.warn('⚠️ Не найдено по тексту, пробуем по классу...');
      
      await page.waitForSelector('.font-roboto.text-\\[14px\\].text-\\[\\#4D4D4D\\]', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('.font-roboto.text-\\[14px\\].text-\\[\\#4D4D4D\\]');
      console.log('✅ Клик по "Пустой проект" (по классу) выполнен');
    }

    // 5️⃣ Ввод названия проекта
    console.log('\n📝 Ввод названия проекта...');
    
    try {
      await page.waitForSelector('input[placeholder="Название проекта"]', {
        state: 'visible',
        timeout: 10000
      });
      console.log('✅ Поле ввода найдено');
      
      await page.fill('input[placeholder="Название проекта"]', PROJECT_NAME);
      await page.waitForTimeout(500);
      console.log(`✅ Введено название: ${PROJECT_NAME}`);
      
    } catch (err) {
      console.warn('⚠️ Не найдено по placeholder, пробуем по классу...');
      
      await page.waitForSelector('input[type="text"].w-\\[300px\\]', {
        state: 'visible',
        timeout: 10000
      });
      await page.fill('input[type="text"].w-\\[300px\\]', PROJECT_NAME);
      await page.waitForTimeout(500);
      console.log(`✅ Введено название: ${PROJECT_NAME}`);
    }

    // 6️⃣ Нажатие на кнопку "Создать проект"
    console.log('\n💾 Нажатие на кнопку "Создать проект"...');
    
    try {
      await page.waitForSelector('button:has-text("Создать проект")', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('button:has-text("Создать проект")');
      console.log('✅ Клик по "Создать проект" выполнен');
      
    } catch (err) {
      console.warn('⚠️ Не найдено по тексту, пробуем по классу...');
      
      await page.waitForSelector('button.bg-\\[\\#111012\\].text-\\[\\#fff\\]', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('button.bg-\\[\\#111012\\].text-\\[\\#fff\\]');
      console.log('✅ Клик по "Создать проект" (по классу) выполнен');
    }

   // 7️⃣ Ожидание создания проекта и перехода на доску
console.log('\n⏳ Ожидание создания проекта...');

try {
  // Ожидаем URL с ID пространства и проекта
  await page.waitForURL(/\/spaces\/\d+\/\d+\/tasks/, { 
    timeout: 15000 
  });
  
  const currentUrl = page.url();
  console.log('✅ Проект создан и доска открыта!');
  console.log(`📍 URL: ${currentUrl}`);
  
  // Извлекаем ID пространства и проекта из URL
  const urlMatch = currentUrl.match(/\/spaces\/(\d+)\/(\d+)\/tasks/);
  if (urlMatch) {
    const spaceId = urlMatch[1];
    const projectId = urlMatch[2];
    console.log(`🆔 ID пространства: ${spaceId}`);
    console.log(`🆔 ID проекта: ${projectId}`);
  }
  
} catch (err) {
  console.warn('⚠️ URL не соответствует ожидаемому паттерну');
  
  const currentUrl = page.url();
  console.log(`📍 Текущий URL: ${currentUrl}`);
  
  // Проверяем альтернативные варианты
  if (currentUrl.includes('/spaces/') && currentUrl.includes('/tasks')) {
    console.log('✅ URL содержит правильные части пути');
    
    const urlMatch = currentUrl.match(/\/spaces\/(\d+)\/(\d+)\/tasks/);
    if (urlMatch) {
      const spaceId = urlMatch[1];
      const projectId = urlMatch[2];
      console.log(`🆔 ID пространства: ${spaceId}`);
      console.log(`🆔 ID проекта: ${projectId}`);
    }
  } else {
    console.error('❌ URL не соответствует ожидаемому формату');
    throw new Error('Не удалось перейти на доску проекта');
  }
}
    
  } finally {
    await browser.close();
    console.log('\nℹ️ Браузер закрыт');
  }
}

createProject()
  .then(() => {
    console.log('\n✨ Тест создания проекта завершён успешно');
  })
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });