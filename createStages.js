const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function createColumn() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const COLUMN_NAME = 'Тестовая колонка';

  console.log('🚀 Запуск теста создания колонки...');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`📋 Название колонки: ${COLUMN_NAME}`);

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

    // 2️⃣ Переход в пространство по XPath
    console.log('\n📁 Переход в пространство...');
    
    try {
      await page.waitForSelector('xpath=/html/body/div[1]/div[1]/section/aside/div[1]/div[2]/div[2]/div[1]/div/div[2]/a[1]/div/div[2]', {
        state: 'visible',
        timeout: 15000
      });
      await page.click('xpath=/html/body/div[1]/div[1]/section/aside/div[1]/div[2]/div[2]/div[1]/div/div[2]/a[1]/div/div[2]');
      console.log('✅ Клик по пространству (XPath) выполнен');
      
    } catch (err) {
      console.warn('⚠️ Не найдено по XPath, пробуем по тексту...');
      await page.waitForSelector('div:has-text("Ваш первый проект")', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('div:has-text("Ваш первый проект")');
      console.log('✅ Клик по пространству (по тексту) выполнен');
    }

    // Небольшая задержка для загрузки страницы
    await page.waitForTimeout(2000);

// 3️⃣ Переход в проект
console.log('\n📂 Переход в проект...');

try {
  // Поиск по XPath
  console.log('🔍 Поиск проекта по XPath...');
  await page.waitForSelector('xpath=/html/body/div[1]/div[1]/section/div/div/div/div/div[3]/div/div/div/div[2]/div/div/div/a/div/div/div[1]/div[2]/div[1]', {
    state: 'visible',
    timeout: 15000
  });
  await page.click('xpath=/html/body/div[1]/div[1]/section/div/div/div/div/div[3]/div/div/div/div[2]/div/div/div/a/div/div/div[1]/div[2]/div[1]');
  console.log('✅ Клик по проекту (XPath) выполнен');
  
} catch (err) {
  console.warn('⚠️ Не найдено по XPath, пробуем по тексту...');
  
  try {
    await page.waitForSelector('div:has-text("Ваш первый проект")', {
      state: 'visible',
      timeout: 10000
    });
    await page.click('div:has-text("Ваш первый проект")');
    console.log('✅ Клик по проекту (по тексту) выполнен');
    
  } catch (err2) {
    console.warn('⚠️ Не найдено по тексту, пробуем по классу...');
    
    await page.waitForSelector('.line-clamp-1.whitespace-pre-wrap', {
      state: 'visible',
      timeout: 10000
    });
    await page.click('.line-clamp-1.whitespace-pre-wrap');
    console.log('✅ Клик по проекту (по классу) выполнен');
  }
}

// Небольшая задержка для загрузки доски
await page.waitForTimeout(2000);

    // Небольшая задержка для загрузки доски
    await page.waitForTimeout(2000);

    // 4️⃣ Нажатие на кнопку "Добавить колонку"
    console.log('\n➕ Нажатие на кнопку "Добавить колонку"...');
    
    await page.waitForSelector('span:has-text("Добавить колонку")', {
      state: 'visible',
      timeout: 10000
    });
    await page.click('span:has-text("Добавить колонку")');
    console.log('✅ Клик по "Добавить колонку" выполнен');

   // 5️⃣ Ввод названия колонки
console.log('\n📝 Ввод названия колонки...');

// Ждём появления textarea
await page.waitForSelector('textarea[type="text"]', {
  state: 'visible',
  timeout: 10000
});

// Очищаем и вводим текст
await page.fill('textarea[type="text"]', COLUMN_NAME);
await page.waitForTimeout(500);
console.log(`✅ Введено название: ${COLUMN_NAME}`);

 // 6️⃣ Сохранение колонки - клик по кнопке
console.log('\n💾 Сохранение колонки...');

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
      console.error('❌ Не удалось сохранить колонку');
      throw new Error('Не удалось сохранить колонку');
    }
  }
}



 // 7️⃣ Проверка POST запроса на сервер
console.log('\n🔍 Проверка отправки POST запроса на сервер...');

try {
  const response = await page.waitForResponse(
    response => {
      const url = response.url();
      const method = response.request().method();
      
      // Проверяем что это POST запрос на создание колонки
      return url.includes('/projects/') && 
             url.includes('/stages') && 
             method === 'POST';
    },
    { timeout: 10000 }
  );
  
  const status = response.status();
  const url = response.url();
  
  console.log(`✅ POST запрос получен!`);
  console.log(`📡 URL: ${url}`);
  console.log(`📊 Статус: ${status} ${status === 201 ? '(Created)' : ''}`);
  
  // Извлекаем данные из URL
  const urlMatch = url.match(/\/projects\/(\d+)\/stages/);
  if (urlMatch) {
    console.log(`🆔 ID проекта: ${urlMatch[1]}`);
  }
  
  // Получаем ответ от сервера
  if (status === 201 || status === 200) {
    try {
      const data = await response.json();
      console.log('✅ Ответ сервера:');
      console.log(`   ID колонки: ${data.id}`);
      console.log(`   Название: ${data.name}`);
      console.log(`   Order: ${data.order}`);
      console.log(`   Project ID: ${data.projectId}`);
      
      // Проверяем что колонка создана с правильным названием
      if (data.name === COLUMN_NAME) {
        console.log('✅ Колонка создана с правильным названием!');
      } else {
        console.warn(`⚠️ Название колонки не совпадает: ожидалось "${COLUMN_NAME}", получено "${data.name}"`);
      }
      
    } catch (e) {
      console.log('⚠️ Не удалось распарсить JSON ответ');
    }
  } else {
    console.warn(`⚠️ Сервер вернул статус: ${status}`);
  }
  
} catch (err) {
  console.error('❌ Не удалось перехватить POST запрос');
  throw new Error('POST запрос на создание колонки не отправлен');
}
    // 8️⃣ Финальный скриншот
    await page.screenshot({ path: 'column-created.png', fullPage: false });
    console.log('📸 Скриншот сохранён: column-created.png');

    console.log('\n✨ Колонка успешно создана!');

  } catch (error) {
    console.error('❌ Ошибка при создании колонки:', error.message);
    
    try {
      await page.screenshot({ path: 'column-error.png' });
      console.log('📸 Скриншот ошибки сохранён: column-error.png');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить скриншот');
    }
    
    try {
      const html = await page.content();
      require('fs').writeFileSync('column-error.html', html);
      console.log('📄 HTML страницы сохранён: column-error.html');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить HTML');
    }
    
    throw error;
    
  } finally {
    await browser.close();
    console.log('\nℹ️ Браузер закрыт');
  }
}

createColumn()
  .then(() => {
    console.log('\n✨ Тест создания колонки завершён успешно');
  })
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });