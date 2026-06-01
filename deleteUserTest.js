const { chromium } = require('playwright');
const { sendSuccess, sendError } = require('./telegram');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function deleteUserTest() {
  // Загрузка переменных из .env
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const CONFIRMATION_EMAIL = 'aleksa2635@yandex.com'; // Email для подтверждения удаления

  console.log('🚀 Запуск теста удаления пользователя...');
  console.log(`📧 Email для входа: ${USER_EMAIL}`);
  console.log(`📧 Email для подтверждения: ${CONFIRMATION_EMAIL}`);

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

    // 6️⃣ Переход в профиль (сначала по классам, затем по XPath)
    console.log('\n👤 Переход в раздел профиля...');
    
    let profileClicked = false;
    
    // Способ 1: По классам (предпочтительный)
    try {
      console.log('🔍 Поиск меню профиля по классам...');
      await page.waitForSelector('div.flex.flex-row.gap-[6px].transition.duration-300.ease-in-out.h-[58px].justify-end', {
        state: 'visible',
        timeout: 10000
      });
      
      await page.click('div.flex.flex-row.gap-[6px].transition.duration-300.ease-in-out.h-[58px].justify-end');
      console.log('✅ Клик по меню профиля выполнен (по классам)');
      profileClicked = true;
    } catch (err) {
      console.warn('⚠️ Не удалось найти меню профиля по классам, пробуем XPath...');
    }
    
    // Способ 2: По XPath (резервный)
    if (!profileClicked) {
      try {
        console.log('🔍 Поиск меню профиля по XPath...');
        const xpathSelector = '/html/body/div[1]/div[1]/section/aside/div[1]/div[1]/a/div';
        
        // Используем локатор с префиксом 'xpath='
        await page.locator(`xpath=${xpathSelector}`).waitFor({ state: 'visible', timeout: 10000 });
        
        // Кликаем по элементу
        await page.locator(`xpath=${xpathSelector}`).click();
        console.log('✅ Клик по меню профиля выполнен (по XPath)');
        profileClicked = true;
      } catch (err) {
        console.error('❌ Не удалось найти меню профиля ни по классам, ни по XPath');
        throw new Error('Не удалось найти меню профиля');
      }
    }
    
    // Ждём появления выпадающего меню
    await page.waitForTimeout(1500);
    
    // Проверяем, что меню открылось
    const isMenuOpen = await page.isVisible('text="Настройки"');
    if (isMenuOpen) {
      console.log('✅ Меню профиля открыто');
    } else {
      console.warn('⚠️ Меню профиля может быть открыто, но не виден элемент "Настройки"');
    }

    // 7️⃣ Переход в настройки (ИСПРАВЛЕНО: используем предоставленный XPath)
    console.log('\n⚙️ Переход в настройки...');
    
    try {
      // Используем предоставленный XPath для кнопки "Настройки"
      const xpathSelector = '/html/body/div[2]/div[1]/div/div/div[1]/div[1]/div[2]';
      
      console.log(`🔍 Поиск кнопки "Настройки" по XPath: ${xpathSelector}`);
      
      // Ожидаем видимости элемента
      await page.locator(`xpath=${xpathSelector}`).waitFor({ 
        state: 'visible', 
        timeout: 15000 
      });
      
      // Кликаем по элементу
      await page.locator(`xpath=${xpathSelector}`).click();
      console.log('✅ Клик по "Настройки" выполнен (по XPath)');
    } catch (err) {
      console.error('❌ Не удалось найти кнопку "Настройки"');
      throw new Error('Не удалось найти кнопку "Настройки"');
    }

    // 8️⃣ Нажатие на "безопасность"
    console.log('\n🗑️ Нажатие на кнопку "безопасность"...');
    
    try {
      // Ищем элемент "Безопасность" на странице настроек
      await page.waitForSelector('text=Безопасность', {
        state: 'visible',
        timeout: 15000
      });
      await page.click('text=Безопасность');
      console.log('✅ Клик по "Безопасность" выполнен');
    } catch (err) {
      console.error('❌ Не удалось найти кнопку "Безопасность"');
      throw new Error('Не удалось найти кнопку "Безопасность"');
    }

    // 9️⃣ Нажатие на "Удалить аккаунт"
    console.log('\n🗑️ Нажатие на кнопку "удалить аккаунт"...');

    try {
      // Ищем элемент "Удалить аккаунт" на странице настроек
      await page.waitForSelector('text=Удалить аккаунт', {
        state: 'visible',
        timeout: 15000
      });
      await page.click('text=Удалить аккаунт');
      console.log('✅ Клик по "Удалить аккаунт" выполнен');

      // Добавляем задержку для появления модального окна
      await page.waitForTimeout(1000);
    } catch (err) {
      console.error('❌ Не удалось найти кнопку "Удалить аккаунт"');
      throw new Error('Не удалось найти кнопку "Удалить аккаунт"');
    }

    // 🔟 Ввод email для подтверждения
    console.log('\n📧 Ввод email для подтверждения удаления...');
    
    try {
      // Ищем поле ввода email
      await page.waitForSelector('input[placeholder="Введите Ваш email для подтверждения"]', {
        state: 'visible',
        timeout: 10000
      });
      
      // Вводим email для подтверждения
      await page.fill('input[placeholder="Введите Ваш email для подтверждения"]', CONFIRMATION_EMAIL);
      console.log(`✅ Введен email для подтверждения: ${CONFIRMATION_EMAIL}`);
    } catch (err) {
      console.error('❌ Не удалось найти поле ввода email');
      throw new Error('Не удалось найти поле ввода email');
    }

    // 1️⃣1️⃣ Нажатие кнопки подтверждения удаления
    console.log('\n⚠️ Нажатие кнопки подтверждения удаления...');

    try {
      // Используем предоставленный XPath для кнопки подтверждения удаления
      const xpathSelector = '//*[@id="modalBoxSubmitButton"]';
      
      console.log(`🔍 Поиск кнопки подтверждения удаления по XPath: ${xpathSelector}`);
      
      // Ожидаем видимости элемента
      await page.locator(`xpath=${xpathSelector}`).waitFor({ 
        state: 'visible', 
        timeout: 10000 
      });
      
      // Нажимаем на кнопку
      await page.locator(`xpath=${xpathSelector}`).click();
      console.log('✅ Клик по кнопке подтверждения удаления выполнен (по XPath)');
      
      // Ждём появления сообщения об успешном удалении
      await page.waitForTimeout(2000);
      
      // Проверяем, что мы перешли на страницу логина
      await page.waitForURL('https://app.striveapp.ru/login', { timeout: 15000 });
      console.log('✅ Пользователь успешно удален и перенаправлен на страницу логина!');
      console.log(`📍 URL страницы логина: ${page.url()}`);
    } catch (err) {
      console.error('❌ Не удалось подтвердить удаление пользователя');
      throw new Error('Не удалось подтвердить удаление пользователя');
    }

    // 1️⃣2️ Сохраняем скриншот для подтверждения
    await page.screenshot({ path: 'user-deleted.png' });
    console.log('📸 Скриншот сохранён: user-deleted.png');

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
      require('fs').writeFileSync('error.html', await page.content());
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

deleteUserTest()
  .then(() => {
    console.log('\n✨ Тест удаления пользователя завершён успешно');
  })
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });