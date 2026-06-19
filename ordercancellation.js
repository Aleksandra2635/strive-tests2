const { chromium } = require('playwright');
const { sendSuccess, sendError } = require('./telegram');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function ordercancellation() {
  // Загрузка переменных из .env
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;

  console.log('🚀 Запуск теста отмены заказа...');

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

    // 6️⃣ Переход в "Моя организация"
    console.log('\n🏢 Переход в раздел "Моя организация"...');
    
    // Способ 1: По тексту ссылки/кнопки
    try {
      await page.waitForSelector('a:has-text("Моя организация"), button:has-text("Моя организация"), [data-testid*="organization"], [data-testid*="org"]', {
        state: 'visible',
        timeout: 20000
      });
      await page.click('a:has-text("Моя организация"), button:has-text("Моя организация")');
      console.log('✅ Клик по "Моя организация" выполнен');
    } catch (err) {
      console.warn('⚠️ Не удалось найти "Моя организация" по тексту, пробуем другие варианты...');
      
      // Способ 2: По иконке организации (если есть)
      try {
        await page.waitForSelector('svg path[d*="organization"], svg path[d*="building"], [data-icon*="org"], [data-icon*="building"]', {
          state: 'visible',
          timeout: 10000
        });
        await page.click('svg path[d*="organization"], svg path[d*="building"], [data-icon*="org"]');
        console.log('✅ Клик по иконке организации выполнен');
      } catch (err2) {
        // Способ 3: По меню профиля (раскрывающееся меню)
        try {
          console.log('🔍 Поиск меню профиля...');
          await page.waitForSelector('[data-testid*="profile"], [data-testid*="user"], button[aria-label*="Профиль"], button[aria-label*="Меню"]', {
            state: 'visible',
            timeout: 10000
          });
          
          // Кликаем по меню профиля
          await page.click('[data-testid*="profile"], [data-testid*="user"], button[aria-label*="Профиль"]');
          console.log('✅ Меню профиля открыто');
          
          // Ждём появления выпадающего меню
          await page.waitForTimeout(1000);
          
          // Ищем "Моя организация" в выпадающем меню
          await page.waitForSelector('text="Моя организация"', { state: 'visible', timeout: 10000 });
          await page.click('text="Моя организация"');
          console.log('✅ Клик по "Моя организация" в меню профиля выполнен');
        } catch (err3) {
          console.warn('⚠️ Не удалось найти "Моя организация" стандартными способами');
          console.warn('💡 Попробуйте найти селектор вручную через DevTools (F12)');
        }
      }
    }

    // 7️⃣ Ожидание загрузки страницы "Моя организация"
console.log('⏳ Ожидание загрузки страницы "Моя организация"...');

// Ждём точного совпадения с нужным урлом
try {
  await page.waitForURL('https://app.striveapp.ru/admin-panel/organization', {
    timeout: 20000
  });
  
  const currentUrl = page.url();
  console.log('✅ Страница "Моя организация" загружена!');
  console.log(`📍 URL страницы организации: ${currentUrl}`);
} catch (err) {
  console.warn('⚠️ Не удалось загрузить страницу "Моя организация"');
  console.warn('💡 Ожидаемый урл: https://app.striveapp.ru/admin-panel/organization');
  console.warn('💡 Текущий урл:', page.url());
}
    // 8️⃣ Переход в "Оплата и тарифы"
    console.log('\n💳 Переход в раздел "Оплата и тарифы"...');
    
    // Способ 1: По тексту кнопки (на основе вашего HTML)
    try {
      // Используем селектор по тексту из вашего HTML
      await page.waitForSelector('button:has-text("Оплата и тарифы")', {
        state: 'visible',
        timeout: 15000
      });
      await page.click('button:has-text("Оплата и тарифы")');
      console.log('✅ Клик по "Оплата и тарифы" выполнен');
    } catch (err) {
      console.warn('⚠️ Не удалось найти "Оплата и тарифы" по тексту, пробуем другие варианты...');
      
      // Способ 2: По классам (на основе вашего HTML)
      try {
        await page.waitForSelector('button.flex.flex-row.gap-[5px].text-[#111012]', {
          state: 'visible',
          timeout: 10000
        });
        await page.click('button.flex.flex-row.gap-[5px].text-[#111012]');
        console.log('✅ Клик по кнопке "Оплата и тарифы" выполнен по классам');
      } catch (err2) {
        // Способ 3: По иконке (если есть)
        try {
          await page.waitForSelector('svg path[d*="payment"], svg path[d*="dollar"], svg path[d*="money"]', {
            state: 'visible',
            timeout: 10000
          });
          await page.click('svg path[d*="payment"], svg path[d*="dollar"], svg path[d*="money"]');
          console.log('✅ Клик по иконке оплаты выполнен');
        } catch (err3) {
          console.warn('⚠️ Не удалось найти "Оплата и тарифы" стандартными способами');
          console.warn('💡 Попробуйте найти селектор вручную через DevTools (F12)');
        }
      }
    }

    // 9️⃣ Ожидание загрузки страницы "Оплата и тарифы"
console.log('⏳ Ожидание загрузки страницы "Оплата и тарифы"...');

try {
  await page.waitForURL('https://app.striveapp.ru/admin-panel/tarif', {
    timeout: 20000
  });
  
  const currentUrl = page.url();
  console.log('✅ Страница "Оплата и тарифы" загружена!');
  console.log(`📍 URL страницы оплаты: ${currentUrl}`);
} catch (err) {
  console.warn('⚠️ Не удалось загрузить страницу "Оплата и тарифы"');
  console.warn('💡 Ожидаемый урл: https://app.striveapp.ru/admin-panel/tarif');
  console.warn('💡 Текущий урл:', page.url());
}

    // 🔟 Отмена заказа
    console.log('\n🔄 Начало процесса отмены заказа...');
    
    // 10.1 Нажатие на кнопку "Отменить заказ"
    console.log('🗑️ Нажатие на кнопку "Отменить заказ"...');
    try {
      // Ожидание появления кнопки "Отменить заказ"
      await page.waitForSelector('button:has-text("Отменить заказ")', {
        state: 'visible',
        timeout: 15000
      });
      
      // Нажатие на кнопку
      await page.click('button:has-text("Отменить заказ")');
      console.log('✅ Клик по "Отменить заказ" выполнен');
      
      // Добавляем небольшую задержку для появления модального окна
      await page.waitForTimeout(1000);
    } catch (err) {
      console.error('❌ Не удалось найти кнопку "Отменить заказ"');
      throw new Error('Не удалось найти кнопку "Отменить заказ"');
    }

    // 10.2 Ввод причины отмены
    console.log('\n📝 Ввод причины отмены...');
    try {
      // Ожидание появления текстового поля
      await page.waitForSelector('textarea[placeholder="Введите причину отмены"]', {
        state: 'visible',
        timeout: 10000
      });

      // Ввод текста "Strive Test"
      await page.fill('textarea[placeholder="Введите причину отмены"]', 'Strive Test');
      console.log('✅ Введена причина: Strive Test');
    } catch (err) {
      console.error('❌ Не удалось найти поле ввода причины');
      throw new Error('Не удалось найти поле ввода причины');
    }

    // 10.3 Нажатие кнопки "Сохранить"
    console.log('\n💾 Нажатие кнопки "Сохранить"...');
    try {
      // Ожидание появления кнопки "Сохранить"
      await page.waitForSelector('button:has-text("Сохранить")', {
        state: 'visible',
        timeout: 10000
      });
      
      // Нажатие на кнопку
      await page.click('button:has-text("Сохранить")');
      console.log('✅ Клик по "Сохранить" выполнен');
      
      // Добавляем небольшую задержку для обработки запроса
      await page.waitForTimeout(2000);
    } catch (err) {
      console.error('❌ Не удалось найти кнопку "Сохранить"');
      throw new Error('Не удалось найти кнопку "Сохранить"');
    }

    // 11️⃣ Сохраняем скриншот для подтверждения
    await page.screenshot({ path: 'cancellation-confirmation.png' });
    console.log('📸 Скриншот сохранён: cancellation-confirmation.png');

  } catch (error) {
    console.error('❌ Ошибка при выполнении теста:', error.message);
    
    // Сохраняем скриншот ошибки
    try {
      await page.screenshot({ path: 'error.png' });
      console.log('📸 Скриншот ошибки сохранён: error.png');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить скриншот');
    }
    
    // Сохраняем HTML для отладки
    try {
      const html = await page.content();
      require('fs').writeFileSync('error.html', html);
      console.log('📄 HTML страницы сохранён: error.html');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить HTML');
    }
    
    throw error;
  } finally {
    // Закрытие браузера (закомментируйте для отладки)
    await browser.close();
    console.log('\nℹ️ Браузер закрыт');
  }
}

ordercancellation()
  .then(() => {
    console.log('\n✨ Тест отмены заказа завершён успешно');
  })
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });