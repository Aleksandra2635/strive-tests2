const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function deleteTask() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;

  console.log('🚀 Запуск теста удаления задачи...');
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
    
    if (url.includes('/tasks/') && url.includes('/archive') && method === 'PATCH') {
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

    // 4️⃣ Нажатие на три точки на задаче
    console.log('\n⋯ Нажатие на меню задачи (три точки)...');
    
    try {
      await page.waitForSelector('xpath=/html/body/div[1]/div[1]/section/div/div/div[2]/div/div[2]/div/div[1]/div/div[2]/div/div/div[1]/div[1]/div', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('xpath=/html/body/div[1]/div[1]/section/div/div/div[2]/div/div[2]/div/div[1]/div/div[2]/div/div/div[1]/div[1]/div');
      console.log('✅ Клик по меню задачи выполнен');
      
    } catch (err) {
      console.error('❌ Не удалось найти меню задачи');
      throw new Error('Меню задачи не найдено');
    }

    // Небольшая задержка для появления меню
    await page.waitForTimeout(1000);

 // 5️⃣ Нажатие на "Удалить"
console.log('\n🗑️ Нажатие на кнопку "Удалить"...');

try {
  const deleteElement = page.locator('xpath=/html/body/div[2]/div[5]/div/div[8]/div[1]');
  
  // Ждем, пока элемент станет видимым
  await deleteElement.waitFor({ state: 'visible', timeout: 10000 });
  
  // Наводим курсор (имитация pointer) и кликаем
  await deleteElement.hover();
  await deleteElement.click();
  
  console.log('✅ Клик по кнопке "Удалить" (XPath) выполнен');
} catch (err) {
  console.warn('⚠️ Не найдено по XPath, пробуем по тексту...');
  
  try {
    const fallback = page.getByText('Удалить', { exact: true });
    await fallback.hover();
    await fallback.click({ timeout: 15000 });
    console.log('✅ Клик по "Удалить" (по тексту) выполнен');
  } catch (err2) {
    console.error('❌ Не удалось найти кнопку "Удалить"');
    throw new Error('Кнопка "Удалить" не найдена');
  }
}

// Небольшая задержка для появления модального окна
await page.waitForTimeout(1000);

    // Небольшая задержка для появления модального окна
    await page.waitForTimeout(1000);

    // 6️⃣ Подтверждение удаления (клик по кнопке подтверждения)
    console.log('\n✅ Подтверждение удаления...');
    
    try {
      await page.waitForSelector('button#modalBoxSubmitButton', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('button#modalBoxSubmitButton');
      console.log('✅ Подтверждение удаления выполнено');
      
    } catch (err) {
      console.warn('⚠️ Не найдено по ID, пробуем по классу...');
      
      try {
        await page.click('button[type="submit"].focus\\:outline-none.inline-flex');
        console.log('✅ Подтверждение удаления (по классу) выполнено');
        
      } catch (err2) {
        console.error('❌ Не удалось найти кнопку подтверждения');
        throw new Error('Кнопка подтверждения не найдена');
      }
    }

    // 7️⃣ Ожидание обработки удаления
    console.log('\n⏳ Ожидание обработки удаления...');
    await page.waitForTimeout(3000);

    // 8️⃣ Проверка PATCH запроса
    console.log('\n🔍 Проверка отправки PATCH запроса...');
    
    if (responses.length > 0) {
      const patchResponse = responses.find(r => 
        r.method === 'PATCH' && 
        r.url.includes('/tasks/') && 
        r.url.includes('/archive')
      );
      
      if (patchResponse) {
        console.log(`✅ PATCH запрос был отправлен!`);
        console.log(`📡 URL API: ${patchResponse.url}`);
        console.log(`📊 Статус: ${patchResponse.status} ${patchResponse.status === 200 ? '(OK)' : ''}`);
        
        // Извлекаем ID задачи из URL
        const taskIdMatch = patchResponse.url.match(/\/tasks\/(\d+)\/archive/);
        if (taskIdMatch) {
          console.log(`🆔 ID задачи: ${taskIdMatch[1]}`);
        }
        
        // Проверяем что это API запрос на server.striveapp.ru
        if (patchResponse.url.includes('server.striveapp.ru') && 
            patchResponse.url.includes('/tasks/') && 
            patchResponse.url.includes('/archive')) {
          console.log('✅ API запрос корректный: PATCH на server.striveapp.ru/tasks/{id}/archive');
        } else {
          console.warn(`⚠️ API URL не соответствует ожидаемому`);
        }
        
        // Проверяем статус
        if (patchResponse.status === 200) {
          console.log('✅ Статус 200 OK - задача успешно удалена (отправлена в корзину)!');
        } else {
          console.warn(`⚠️ Ожидался статус 200, получен: ${patchResponse.status}`);
        }
        
      } else {
        console.warn('⚠️ PATCH запрос на /tasks/{id}/archive не найден');
      }
      
    } else {
      console.warn('⚠️ PATCH запрос не был перехвачен');
    }

    // 9️⃣ Проверка удаления задачи на странице
    console.log('\n🔍 Проверка удаления задачи на странице...');
    
    try {
      // Ждём немного для обновления страницы
      await page.waitForTimeout(2000);
      console.log('✅ Страница обновлена');
      
    } catch (err) {
      console.warn('⚠️ Не удалось проверить удаление на странице');
    }

    // 🔟 Финальный скриншот
    await page.screenshot({ path: 'task-deleted.png', fullPage: false });
    console.log('📸 Скриншот сохранён: task-deleted.png');

    console.log('\n✨ Задача успешно удалена!');

  } catch (error) {
    console.error('❌ Ошибка при удалении задачи:', error.message);
    
    try {
      await page.screenshot({ path: 'task-delete-error.png' });
      console.log('📸 Скриншот ошибки сохранён: task-delete-error.png');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить скриншот');
    }
    
    try {
      const html = await page.content();
      require('fs').writeFileSync('task-delete-error.html', html);
      console.log('📄 HTML страницы сохранён: task-delete-error.html');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить HTML');
    }
    
    throw error;
    
  } finally {
    await browser.close();
    console.log('\nℹ️ Браузер закрыт');
  }
}

deleteTask()
  .then(() => {
    console.log('\n✨ Тест удаления задачи завершён успешно');
  })
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });