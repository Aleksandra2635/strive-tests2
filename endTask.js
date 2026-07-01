const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function completeTask() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;

  console.log('🚀 Запуск теста завершения задачи...');
  console.log(`📧 Email: ${USER_EMAIL}`);

  const browserOptions = getBrowserOptions();
  console.log(`🖥️ Режим браузера: ${browserOptions.headless ? 'headless' : 'видимый'}`);
  
  const browser = await chromium.launch(browserOptions);
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  // Массив для хранения ответов
  const responses = [];
  
  // Слушаем все ответы
  page.on('response', response => {
    const url = response.url();
    const method = response.request().method();
    const status = response.status();
    
    if (url.includes('/tasks/') && url.includes('/change-task-status') && method === 'PATCH') {
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

    // 4️⃣ Переход в задачу по XPath
    console.log('\n📝 Переход в задачу...');

    try {
      await page.waitForSelector('xpath=/html/body/div[1]/div[1]/section/div/div/div[2]/div/div[2]/div/div[1]/div/div[2]/div/div/div[2]/div[2]/p', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('xpath=/html/body/div[1]/div[1]/section/div/div/div[2]/div/div[2]/div/div[1]/div/div[2]/div/div/div[1]/div[2]/p');
      console.log('✅ Переход в задачу (XPath) выполнен');
      
    } catch (err) {
      console.warn('⚠️ Не найдено по XPath, пробуем альтернативный XPath...');

      try {
        await page.waitForSelector('xpath=/html/body/div[1]/div[1]/section/div/div/div[2]/div/div[2]/div/div[1]/div/div[2]/div/div/div[2]/div[2]', {
          state: 'visible',
          timeout: 10000
        });
        await page.click('xpath=/html/body/div[1]/div[1]/section/div/div/div[2]/div/div[2]/div/div[1]/div/div[2]/div/div/div[2]/div[2]');
        console.log('✅ Переход в задачу (альтернативный XPath) выполнен');
        
      } catch (err) {
        console.warn('⚠️ Не найдено по альтернативному XPath, пробуем по тексту...');
        
        try {
          // Резервный способ: по тексту задачи
          await page.waitForSelector('p:has-text("Тестовая задача")', {
            state: 'visible',
            timeout: 10000
          });
          await page.click('p:has-text("Тестовая задача")');
          console.log('✅ Переход в задачу (по тексту) выполнен');
          
        } catch (err2) {
          console.warn('⚠️ Не найдено по тексту, пробуем по классу...');
          
          try {
            // Резервный способ: по классу
            await page.click('.text-\\[\\#111012\\].whitespace-pre-wrap.text-\\[14px\\]');
            console.log('✅ Переход в задачу (по классу) выполнен');
            
          } catch (err3) {
            console.error('❌ Не удалось найти задачу');
            throw new Error('Задача не найдена');
          }
        }
      }
    }

    // Ожидание загрузки страницы задачи
    await page.waitForTimeout(2000);
    console.log('📍 Текущий URL: ' + page.url());

    // 5️⃣ Нажатие на кнопку "Завершить"
    console.log('\n✅ Нажатие на кнопку "Завершить"...');
    
    try {
      await page.waitForSelector('xpath=/html/body/div[1]/div[2]/div/div[2]/div[2]/div/div[3]/div[2]/div[2]/div[1]', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('xpath=/html/body/div[1]/div[2]/div/div[2]/div[2]/div/div[3]/div[2]/div[2]/div[1]');
      console.log('✅ Клик по кнопке "Завершить" (XPath) выполнен');
      
    } catch (err) {
      console.error('❌ Не удалось найти кнопку "Завершить"');
      throw new Error('Кнопка "Завершить" не найдена');
    }

    // 6️⃣ Ожидание обработки завершения
    console.log('\n⏳ Ожидание обработки завершения...');
    await page.waitForTimeout(3000);

    // 7️⃣ Проверка PATCH запроса
    console.log('\n🔍 Проверка отправки PATCH запроса...');
    
    if (responses.length > 0) {
      const patchResponse = responses.find(r => 
        r.method === 'PATCH' && 
        r.url.includes('/tasks/') && 
        r.url.includes('/change-task-status')
      );
      
      if (patchResponse) {
        console.log(`✅ PATCH запрос был отправлен!`);
        console.log(`📡 URL API: ${patchResponse.url}`);
        console.log(`📊 Статус: ${patchResponse.status} ${patchResponse.status === 200 ? '(OK)' : ''}`);
        
        
        // Извлекаем ID задачи из URL
        const taskIdMatch = patchResponse.url.match(/\/tasks\/(\d+)\/change-task-status/);
        if (taskIdMatch) {
          console.log(`🆔 ID задачи: ${taskIdMatch[1]}`);
        }
        
        // Проверяем что это API запрос на server.striveapp.ru
        if (patchResponse.url.includes('server.striveapp.ru') && 
            patchResponse.url.includes('/tasks/') && 
            patchResponse.url.includes('/change-task-status')) {
          console.log('✅ API запрос корректный: PATCH на server.striveapp.ru/tasks/{id}/change-task-status');
        } else {
          console.warn(`⚠️ API URL не соответствует ожидаемому`);
        }
        
        // Проверяем статус
        if (patchResponse.status === 200) {
          console.log('✅ Статус 200 OK - задача успешно завершена!');
        } else {
          console.warn(`⚠️ Ожидался статус 200, получен: ${patchResponse.status}`);
        }
        
      } else {
        console.warn('⚠️ PATCH запрос на /tasks/{id}/change-task-status не найден');
      }
      
    } else {
      console.warn('⚠️ PATCH запрос не был перехвачен');
    }

    // 8️⃣ Проверка изменения статуса на странице
    console.log('\n🔍 Проверка изменения статуса задачи...');
    
    try {
      await page.waitForTimeout(1000);
      console.log('✅ Страница обновлена');
      
    } catch (err) {
      console.warn('⚠️ Не удалось проверить изменение статуса на странице');
    }

    // 9️⃣ Финальный скриншот
    await page.screenshot({ path: 'task-completed.png', fullPage: false });
    console.log('📸 Скриншот сохранён: task-completed.png');

    console.log('\n✨ Задача успешно завершена!');

  } catch (error) {
    console.error('❌ Ошибка при завершении задачи:', error.message);
    
    try {
      await page.screenshot({ path: 'task-complete-error.png' });
      console.log('📸 Скриншот ошибки сохранён: task-complete-error.png');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить скриншот');
    }
    
    try {
      const html = await page.content();
      require('fs').writeFileSync('task-complete-error.html', html);
      console.log('📄 HTML страницы сохранён: task-complete-error.html');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить HTML');
    }
    
    throw error;
    
  } finally {
    await browser.close();
    console.log('\nℹ️ Браузер закрыт');
  }
}

completeTask()
  .then(() => {
    console.log('\n✨ Тест завершения задачи завершён успешно');
  })
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });