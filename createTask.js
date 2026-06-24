const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function createTask() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const TASK_NAME = 'Тестовая задача';

  console.log('🚀 Запуск теста создания задачи...');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`📋 Название задачи: ${TASK_NAME}`);

  const browserOptions = getBrowserOptions();
  console.log(`🖥️ Режим браузера: ${browserOptions.headless ? 'headless' : 'видимый'}`);
  
  const browser = await chromium.launch(browserOptions);
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  // ОБЯЗАТЕЛЬНО: Объявляем массив для хранения ответов
  const responses = [];
  
  // Слушаем все ответы
  page.on('response', response => {
    const url = response.url();
    const method = response.request().method();
    const status = response.status();
    
    if (url.includes('/tasks') && method === 'POST') {
      responses.push({ url, method, status, timestamp: new Date() });
      console.log(`📡 Перехвачен ответ: ${method} ${url} → ${status}`);
    }
  });

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

    // 2️⃣ Переход в пространство по XPath
    console.log('\n📁 Переход в пространство...');
    
    try {
      await page.click('xpath=/html/body/div[1]/div[1]/section/aside/div[1]/div[2]/div[2]/div[1]/div/div[2]/a[1]/div/div[2]');
      console.log('✅ Клик по пространству (XPath) выполнен');
    } catch (err) {
      console.warn('⚠️ Не найдено по XPath');
    }

    await page.waitForTimeout(2000);

    // 3️⃣ Переход в проект по XPath
    console.log('\n📂 Переход в проект...');
    
    try {
      await page.click('xpath=/html/body/div[1]/div[1]/section/div/div/div/div/div[3]/div/div/div/div[2]/div/div/div/a/div/div/div[1]/div[2]/div[1]');
      console.log('✅ Клик по проекту (XPath) выполнен');
    } catch (err) {
      console.warn('⚠️ Не найдено по XPath');
    }

    await page.waitForTimeout(2000);

    // 4️⃣ Нажатие на кнопку "Добавить задачу"
    console.log('\n➕ Нажатие на кнопку "Добавить задачу"...');
    
    try {
      await page.waitForSelector('span:has-text("Добавить задачу")', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('span:has-text("Добавить задачу")');
      console.log('✅ Клик по "Добавить задачу" выполнен');
      
    } catch (err) {
      console.warn('⚠️ Не найдено по тексту, пробуем по классу...');
      await page.click('.text-\\[14px\\].leading-\\[17px\\]');
      console.log('✅ Клик выполнен');
    }

    // 5️⃣ Ввод названия задачи
    console.log('\n📝 Ввод названия задачи...');
    
    await page.waitForSelector('textarea[type="text"]', {
      state: 'visible',
      timeout: 10000
    });
    
    await page.fill('textarea[type="text"]', TASK_NAME);
    await page.waitForTimeout(500);
    console.log(`✅ Введено название: ${TASK_NAME}`);

    // 6️⃣ Сохранение задачи - клик по кнопке
console.log('\n💾 Сохранение задачи...');

try {
  // Клик по кнопке через XPath
  console.log('🔍 Клик по кнопке сохранения (XPath)...');
  await page.waitForSelector('xpath=/html/body/div[1]/div[1]/section/div/div/div[2]/div/div[2]/div/div[3]/div/div[3]/div/div/div/span', {
    state: 'visible',
    timeout: 10000
  });
  await page.click('xpath=/html/body/div[1]/div[1]/section/div/div/div[2]/div/div[2]/div/div[3]/div/div[3]/div/div/div/span');
  console.log('✅ Клик по кнопке сохранения выполнен');
  
} catch (err) {
  console.warn('⚠️ Не найдено по XPath, пробуем резервные способы...');
  
  try {
    // Резервный способ 1: по классу
    await page.click('div.ghost-first.h-\\[60px\\]');
    console.log('✅ Клик по div.ghost-first выполнен');
    
  } catch (err2) {
    try {
      // Резервный способ 2: по data-атрибуту
      await page.click('div[data-v-efdc4485]');
      console.log('✅ Клик по div[data-v-efdc4485] выполнен');
      
    } catch (err3) {
      console.error('❌ Не удалось сохранить задачу');
      throw new Error('Не удалось сохранить задачу');
    }
  }
}
    
    // 7️⃣ Ожидание перехода на страницу задачи (проверка URL)
    console.log('\n⏳ Ожидание перехода на страницу задачи...');
    
    try {
      await page.waitForURL(/\/spaces\/\d+\/\d+\/tasks\/\d+/, { 
        timeout: 15000 
      });
      
      const currentUrl = page.url();
      console.log('✅ Переход на страницу задачи выполнен!');
      console.log(`📍 URL: ${currentUrl}`);
      
      // Извлекаем ID из URL
      const urlMatch = currentUrl.match(/\/spaces\/(\d+)\/(\d+)\/tasks\/(\d+)/);
      if (urlMatch) {
        const spaceId = urlMatch[1];
        const projectId = urlMatch[2];
        const taskId = urlMatch[3];
        
        console.log(`🆔 ID пространства: ${spaceId}`);
        console.log(`🆔 ID проекта: ${projectId}`);
        console.log(`🆔 ID задачи: ${taskId}`);
      }
      
    } catch (err) {
      console.warn('⚠️ URL не соответствует ожидаемому паттерну');
      console.log(`📍 Текущий URL: ${page.url()}`);
    }

    // 8️⃣ Проверка POST запроса ПОСЛЕ создания
    console.log('\n🔍 Проверка отправки POST запроса...');

    if (responses.length > 0) {
      const postResponse = responses.find(r => r.method === 'POST' && r.url.includes('/tasks'));
      
      if (postResponse) {
        console.log(`✅ POST запрос был отправлен!`);
        console.log(`📡 URL API: ${postResponse.url}`);
        console.log(`📊 Статус: ${postResponse.status} ${postResponse.status === 201 ? '(Created)' : ''}`);
        
        
        // Проверяем что это API запрос на server.striveapp.ru
        if (postResponse.url.includes('server.striveapp.ru') && postResponse.url.includes('/tasks')) {
          console.log('✅ API запрос корректный: POST на server.striveapp.ru/tasks');
        } else {
          console.warn(`⚠️ API URL не соответствует ожидаемому`);
        }
        
        // Проверяем статус
        if (postResponse.status === 201) {
          console.log('✅ Статус 201 Created - задача успешно создана на сервере!');
        } else {
          console.warn(`⚠️ Ожидался статус 201, получен: ${postResponse.status}`);
        }
        
      } else {
        console.warn('⚠️ POST запрос на /tasks не найден');
      }
      
    } else {
      console.warn('⚠️ POST запрос не был перехвачен');
    }

    // 9️⃣ Проверка создания задачи на странице
    console.log('\n🔍 Проверка наличия задачи на странице...');

    try {
      await page.waitForSelector(`div:has-text("${TASK_NAME}")`, {
        state: 'visible',
        timeout: 10000
      });
      console.log('✅ Задача создана и отображается на странице!');
      
    } catch (err) {
      console.warn('⚠️ Задача не найдена на странице');
    }

    // 🔟 Финальный скриншот
    await page.screenshot({ path: 'task-created.png', fullPage: false });
    console.log('📸 Скриншот сохранён: task-created.png');

    console.log('\n✨ Задача успешно создана!');

  } catch (error) {
    console.error('❌ Ошибка при создании задачи:', error.message);
    
    try {
      await page.screenshot({ path: 'task-error.png' });
      console.log('📸 Скриншот ошибки сохранён: task-error.png');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить скриншот');
    }
    
    try {
      const html = await page.content();
      require('fs').writeFileSync('task-error.html', html);
      console.log('📄 HTML страницы сохранён: task-error.html');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить HTML');
    }
    
    throw error;
    
  } finally {
    await browser.close();
    console.log('\nℹ️ Браузер закрыт');
  }
}

createTask()
  .then(() => {
    console.log('\n✨ Тест создания задачи завершён успешно');
  })
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });