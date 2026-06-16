const { chromium } = require('playwright');
const { sendSuccess, sendError } = require('./telegram');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function createWorkspace() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const WORKSPACE_NAME = process.env.WORKSPACE_NAME || `Тестовое пространство ${Date.now()}`;

  console.log('🚀 Запуск теста создания пространства...');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`📦 Название пространства: ${WORKSPACE_NAME}`);

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
    // 1️⃣ Открытие страницы входа
    console.log('\n🌐 Открытие страницы входа...');
    await page.goto('https://app.striveapp.ru/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    console.log('✅ Страница входа загружена');

    // 2️⃣ Ожидание и ввод данных
    console.log('⏳ Ожидание полей ввода...');
    await page.waitForSelector('[name="email"]', { 
      state: 'visible', 
      timeout: 30000 
    });

    console.log('📝 Ввод email...');
    await page.fill('[name="email"]', USER_EMAIL);
    
    console.log('📝 Ввод пароля...');
    await page.fill('[name="password"]', USER_PASSWORD);

    // 3️⃣ Клик по кнопке "Продолжить"
    console.log('🖱️ Нажатие кнопки "Продолжить"...');
    await page.waitForSelector('button[type="submit"]', { 
      state: 'visible', 
      timeout: 15000 
    });
    await page.click('button[type="submit"]');

    // 4️⃣ Ожидание успешного входа
    console.log('⏳ Ожидание завершения входа...');
    await page.waitForURL(/(\/main|\/dashboard|\/workspace)/, { timeout: 45000 });
    console.log('✅ Вход успешно выполнен!');
    console.log(`🏠 Текущий URL: ${page.url()}`);
    
// 5️⃣ Поиск и нажатие кнопки "Добавить Пространство" (плюсик)
console.log('\n➕ Поиск кнопки создания пространства...');

try {
  // Способ 1: По ID (самый надежный)
  console.log('🔍 Поиск кнопки по ID addSpaceButton...');
  await page.waitForSelector('#addSpaceButton', {
    state: 'visible',
    timeout: 10000
  });
  await page.click('#addSpaceButton');
  console.log('✅ Клик по кнопке #addSpaceButton выполнен');
  
} catch (err) {
  console.warn('⚠️ Не найдено по ID, пробуем по классам...');
  
  try {
    // Способ 2: По классам
    await page.waitForSelector('.min-w-\\[40px\\].h-\\[40px\\].cursor-pointer', {
      state: 'visible',
      timeout: 10000
    });
    await page.click('.min-w-\\[40px\\].h-\\[40px\\].cursor-pointer');
    console.log('✅ Клик по кнопке (по классам) выполнен');
    
  } catch (err2) {
    console.warn('⚠️ Не найдено по классам, пробуем data-testid...');
    
    try {
      // Способ 3: По data-testid
      await page.waitForSelector('[data-testid*="add-workspace"], [data-testid*="create-workspace"]', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('[data-testid*="add-workspace"], [data-testid*="create-workspace"]');
      console.log('✅ Клик по кнопке (data-testid) выполнен');
      
    } catch (err3) {
      console.error('❌ Не удалось найти кнопку создания пространства');
      throw new Error('Кнопка создания пространства не найдена');
    }
  }
}


    // Клик по кнопке "Новое пространство"
    console.log('\n📦 Клик по кнопке "Новое пространство"...');
    
    try {
      await page.waitForSelector('p:has-text("Новое пространство")', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('p:has-text("Новое пространство")');
      console.log('✅ Клик по "Новое пространство" выполнен');
      
    } catch (err) {
      console.warn('⚠️ Не найдено по тексту, пробуем "Пустое пространство"...');
      
      try {
        await page.waitForSelector('p:has-text("Пустое пространство")', {
          state: 'visible',
          timeout: 10000
        });
        await page.click('p:has-text("Пустое пространство")');
        console.log('✅ Клик по "Пустое пространство" выполнен');
        
      } catch (err2) {
        console.error('❌ Не удалось найти кнопку создания пространства');
        throw new Error('Кнопка создания пространства не найдена');
      }
    }

// 6️⃣ Клик по кнопке "Пустое пространство"
console.log('\n📦 Клик по кнопке "Пустое пространство"...');

try {
  // Поиск по XPath
  console.log('🔍 Поиск кнопки по XPath...');
  await page.waitForSelector('xpath=/html/body/div[1]/div[1]/div/div[3]/div[1]/svg/rect[3]', {
    state: 'visible',
    timeout: 10000
  });
  await page.click('xpath=/html/body/div[1]/div[1]/div/div[3]/div[1]/svg/rect[3]');
  console.log('✅ Клик по кнопке (XPath) выполнен');
  
} catch (err) {
  console.warn('⚠️ Не найдено по XPath, пробуем по тексту...');
  
  try {
    await page.waitForSelector('p:has-text("Пустое пространство")', {
      state: 'visible',
      timeout: 10000
    });
    await page.click('p:has-text("Пустое пространство")');
    console.log('✅ Клик по "Пустое пространство" выполнен');
    
  } catch (err3) {
    console.error('❌ Не удалось найти кнопку создания пространства');
    throw new Error('Кнопка создания пространства не найдена');
  }
}

// Небольшая задержка для появления меню
await page.waitForTimeout(5000);

    // 7️⃣ Ожидание перехода на страницу создания
    console.log('\n⏳ Ожидание перехода на страницу создания...');
    await page.waitForURL('https://app.striveapp.ru/space-create-simple', { 
      timeout: 15000 
    });
    console.log('✅ Страница создания загружена!');
    console.log(`📍 URL: ${page.url()}`);

    // 8️⃣ Заполнение формы создания пространства
console.log('\n📝 Заполнение формы создания пространства...');

try {
  // Поиск по XPath
  console.log('🔍 Поиск поля ввода по XPath...');
  await page.waitForSelector('xpath=/html/body/div[1]/div[1]/div/div[2]/div/div[1]/input', {
    state: 'visible',
    timeout: 10000
  });
  console.log('✅ Поле ввода названия найдено');
  
  const workspaceName = 'Тестовое пространство';
  console.log(`📦 Ввод названия: ${workspaceName}`);
  await page.fill('xpath=/html/body/div[1]/div[1]/div/div[2]/div/div[1]/input', workspaceName);
  await page.waitForTimeout(500);
  console.log('✅ Название введено');
  
} catch (err) {
  console.warn('⚠️ Не найдено по XPath, пробуем по placeholder...');
  
  // Резервный способ: по placeholder
  await page.waitForSelector('input[placeholder="Введите название пространства"]', {
    state: 'visible',
    timeout: 10000
  });
  console.log('✅ Поле ввода названия найдено (по placeholder)');
  
  const workspaceName = 'Тестовое пространство';
  console.log(`📦 Ввод названия: ${workspaceName}`);
  await page.fill('input[placeholder="Введите название пространства"]', workspaceName);
  await page.waitForTimeout(500);
  console.log('✅ Название введено');
}

    // 9️⃣ Нажатие кнопки "Продолжить"
    console.log('\n💾 Нажатие кнопки "Продолжить"...');
    
    try {
      await page.waitForSelector('button:has-text("Продолжить")', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('button:has-text("Продолжить")');
      console.log('✅ Клик по кнопке "Продолжить" выполнен');
      
    } catch (err) {
      console.warn('⚠️ Не найдено по тексту, пробуем по классу...');
      
      try {
        await page.waitForSelector('button.bg-\\[\\#111012\\]', {
          state: 'visible',
          timeout: 10000
        });
        await page.click('button.bg-\\[\\#111012\\]');
        console.log('✅ Клик по кнопке выполнен');
        
      } catch (err2) {
        console.error('❌ Не удалось найти кнопку "Продолжить"');
        throw new Error('Кнопка "Продолжить" не найдена');
      }
    }

    
// 🔟 Нажатие кнопки "Начать работу"
console.log('\n🚀 Нажатие кнопки "Начать работу"...');

try {
  // Поиск по XPath
  console.log('🔍 Поиск кнопки по XPath...');
  await page.waitForSelector('xpath=/html/body/div[1]/div[1]/div/div[2]/div/button', {
    state: 'visible',
    timeout: 10000
  });
  await page.click('xpath=/html/body/div[1]/div[1]/div/div[2]/div/button');
  console.log('✅ Клик по кнопке "Начать работу" выполнен');
  
} catch (err) {
  console.warn('⚠️ Не найдено по XPath, пробуем по тексту...');
  
  try {
    // Резервный способ: по тексту
    await page.waitForSelector('button:has-text("Начать работу")', {
      state: 'visible',
      timeout: 10000
    });
    await page.click('button:has-text("Начать работу")');
    console.log('✅ Клик по кнопке "Начать работу" выполнен (по тексту)');
    
  } catch (err2) {
    console.warn('⚠️ Не найдено по тексту, пробуем по классу...');
    
    try {
      // Резервный способ: по классу
      await page.waitForSelector('button.bg-\\[\\#111012\\]', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('button.bg-\\[\\#111012\\]');
      console.log('✅ Клик по кнопке выполнен (по классу)');
      
    } catch (err3) {
      console.error('❌ Не удалось найти кнопку "Начать работу"');
      throw new Error('Кнопка "Начать работу" не найдена');
    }
  }
}

// 1️⃣1️⃣ Проверка перехода в рабочее пространство
console.log('\n✅ Проверка перехода в рабочее пространство...');

try {
  // Ожидаем URL с любым ID пространства
  await page.waitForURL(/\/spaces\/\d+\/projects/, { 
    timeout: 15000 
  });
  
  const currentUrl = page.url();
  console.log('✅ Переход в пространство выполнен успешно!');
  console.log(`📍 URL: ${currentUrl}`);
  
  // Извлекаем ID пространства из URL
  const spaceIdMatch = currentUrl.match(/\/spaces\/(\d+)\/projects/);
  if (spaceIdMatch) {
    const spaceId = spaceIdMatch[1];
    console.log(`🆔 ID пространства: ${spaceId}`);
  }
  
} catch (err) {
  console.warn('⚠️ URL не соответствует ожидаемому паттерну');
  
  // Проверяем текущий URL
  const currentUrl = page.url();
  console.log(`📍 Текущий URL: ${currentUrl}`);
  
  // Проверяем, содержит ли URL части /spaces/ и /projects
  if (currentUrl.includes('/spaces/') && currentUrl.includes('/projects')) {
    console.log('✅ URL содержит правильные части пути');
    
    const spaceIdMatch = currentUrl.match(/\/spaces\/(\d+)\/projects/);
    if (spaceIdMatch) {
      const spaceId = spaceIdMatch[1];
      console.log(`🆔 ID пространства: ${spaceId}`);
    }
  } else {
    console.error('❌ URL не соответствует ожидаемому формату');
    throw new Error('Не удалось перейти в рабочее пространство');
  }
}

// 1️⃣2️⃣ Финальный скриншот
await page.screenshot({ path: 'workspace-final.png', fullPage: false });
console.log('📸 Финальный скриншот сохранён: workspace-final.png');

console.log('\n✨ Пространство успешно создано и открыто!');

} catch (error) {
  console.error('❌ Ошибка при создании пространства:', error.message);
  
  try {
    await page.screenshot({ path: 'workspace-error.png' });
    console.log('📸 Скриншот ошибки сохранён: workspace-error.png');
  } catch (e) {
    console.warn('⚠️ Не удалось сохранить скриншот');
  }
  
  try {
    const html = await page.content();
    require('fs').writeFileSync('workspace-error.html', html);
    console.log('📄 HTML страницы сохранён: workspace-error.html');
  } catch (e) {
    console.warn('⚠️ Не удалось сохранить HTML');
  }
  
  throw error;
  
} finally {
  await browser.close();
  console.log('\nℹ️ Браузер закрыт');
}
}

createWorkspace()
  .then(() => {
    console.log('\n✨ Тест создания пространства завершён успешно');
  })
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });