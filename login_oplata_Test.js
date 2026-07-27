const { chromium } = require('playwright');
const { sendSuccess, sendError } = require('./telegram');
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

    // 6️⃣ Переход в "Моя организация"
    console.log('\n🏢 Переход в раздел "Моя организация"...');
    
    // Находим элемент по точному XPath и кликаем по нему
    await page.locator('xpath=/html/body/div[1]/div[1]/section/aside/div[1]/div[2]/div[1]/a[4]/div/div[2]').click({ timeout: 15000 });
    
    console.log('✅ Клик по "Моя организация" выполнен');
    
    // Небольшая пауза для загрузки содержимого раздела
    await page.waitForTimeout(1000);

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

    // 🔟 Выбор тарифа "Оптимальный тариф для 15 человек"
    console.log('\n🎯 Поиск тарифа "Оптимальный тариф для 15 человек"...');
    
    try {
      // Ожидаем появления элемента с текстом тарифа
      await page.waitForSelector('text="Оптимальный тариф для команд до 15 человек"', {
        state: 'visible',
        timeout: 15000
      });
      
      console.log('✅ Найден тариф "Оптимальный тариф для 15"');
      
      // Ищем кнопку "Подключить тариф" внутри того же контейнера
      console.log('🔍 Поиск кнопки "Подключить тариф"...');
      
      // Способ 1: По тексту кнопки внутри контейнера тарифа
      await page.locator('text="Оптимальный тариф для команд до 15 человек"')
        .locator('xpath=../..')
        .locator('button:has-text("Подключить тариф")')
        .click();
      
      console.log('✅ Клик по "Подключить тариф" выполнен');
      
    } catch (err) {
      console.warn('⚠️ Не удалось найти тариф или кнопку "Подключить тариф"');
      
      // Альтернативный поиск по селекторам из HTML
      try {
        await page.waitForSelector('div:has-text("Оптимальный тариф для команд до 15 человек")', {
          state: 'visible',
          timeout: 10000
        });
        
        // Ищем кнопку по классам из HTML
        await page.waitForSelector('button.px-[20px].h-[40px].text-[#111012]', {
          state: 'visible',
          timeout: 10000
        });
        
        await page.click('button.px-[20px].h-[40px].text-[#111012]');
        console.log('✅ Клик по кнопке "Подключить тариф" выполнен по классам');
      } catch (err2) {
        console.error('❌ Не удалось найти кнопку "Подключить тариф" ни по одному из способов');
        throw new Error('Не удалось найти кнопку "Подключить тариф"');
      }
    }

    // 🔟1️⃣ Обработка модального окна: нажатие "Перейти к покупке"
    console.log('\nModal window: Переход к покупке...');
    
    try {
      // Ожидание появления кнопки "Перейти к покупке" в модальном окне
      await page.waitForSelector('button:has-text("Перейти к покупке")', {
        state: 'visible',
        timeout: 15000
      });
      console.log('✅ Модальное окно открыто');
      
      // Нажатие на кнопку "Перейти к покупке"
      await page.click('button:has-text("Перейти к покупке")');
      console.log('✅ Клик по "Перейти к покупке" выполнен');
    } catch (err) {
      console.error('❌ Не удалось найти кнопку "Перейти к покупке" в модальном окне');
      throw new Error('Не удалось найти кнопку "Перейти к покупке" в модальном окне');
    }

    // 🔟2️⃣ Ввод российского номера телефона
    console.log('\n📱 Ввод российского номера телефона...');
    
    try {
      // Ожидание появления поля ввода телефона
      await page.waitForSelector('input[name="phone"]', {
        state: 'visible',
        timeout: 10000
      });
      
      // Ввод российского номера телефона (формат: 9999999999)
      const russianPhone = '9999999999';
      await page.fill('input[name="phone"]', russianPhone);
      console.log(`✅ Введен номер телефона: ${russianPhone}`);
    } catch (err) {
      console.error('❌ Не удалось найти поле ввода телефона');
      throw new Error('Не удалось найти поле ввода телефона');
    }

    // 🔟3️⃣ Нажатие на кнопку "Оформить заказ"
    console.log('\n📦 Оформление заказа...');
    
    try {
      // Ожидание появления кнопки "Оформить заказ"
      await page.waitForSelector('button:has-text("Оформить заказ")', {
        state: 'visible',
        timeout: 10000
      });
      
      // Нажатие на кнопку "Оформить заказ"
      await page.click('button:has-text("Оформить заказ")');
      console.log('✅ Клик по "Оформить заказ" выполнен');
    } catch (err) {
      console.error('❌ Не удалось найти кнопку "Оформить заказ"');
      throw new Error('Не удалось найти кнопку "Оформить заказ"');
    }

    // 🔟4️⃣ Проверка перехода на страницу оплаты YooMoney
    console.log('\n💳 Проверка перехода на страницу оплаты YooMoney...');
    
    try {
      // Ждём перехода на страницу оплаты YooMoney
      await page.waitForURL('https://yoomoney.ru/checkout/payments/v2/contract?*', {
        timeout: 30000
      });
      
      const paymentUrl = page.url();
      console.log('✅ Переход на страницу оплаты выполнен успешно!');
      console.log(`📍 URL страницы оплаты: ${paymentUrl}`);
    } catch (err) {
      console.error('❌ Не удалось перейти на страницу оплаты YooMoney');
      throw new Error('Не удалось перейти на страницу оплаты YooMoney');
    }

    // 1️⃣1️⃣ Сохраняем скриншот для подтверждения
    await page.screenshot({ path: 'payment-page.png' });
    console.log('📸 Скриншот сохранён: payment-page.png');

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

login_oplata_Test()
  .then(() => {
    console.log('\n✨ Тест входа и оплаты завершён успешно');
  })
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });