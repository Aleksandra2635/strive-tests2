const { chromium } = require('playwright');
const { getBrowserOptions, getTimeouts } = require('./browserConfig');

(async () => {
  // Получаем настройки браузера (headless, аргументы) и таймауты из конфиг-файла
  const browserOptions = getBrowserOptions();
  const timeouts = getTimeouts();
  
  const browser = await chromium.launch(browserOptions);
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Перехватываем будущий POST-запрос к API до начала действий
    const apiResponsePromise = page.waitForResponse(
      (response) =>
        response.url() === 'https://server.striveapp.ru/contact/request' &&
        response.request().method() === 'POST'
    );

    // 1. Переход на главную с использованием глобального таймаута навигации
    console.log('Открываем https://striveapp.ru/ ...');
    await page.goto('https://striveapp.ru/', { 
      waitUntil: 'domcontentloaded', 
      timeout: timeouts.navigation 
    });

    // 2. Клик на "Хочу демонстрацию"
    console.log('Клик по кнопке "Хочу демонстрацию"...');
    await page.getByRole('button', { name: 'Хочу демонстрацию' }).click();

    // Ждем появления модального окна с использованием глобального таймаута селекторов
    await page.waitForSelector('input[placeholder="Имя"]', { 
      state: 'visible', 
      timeout: timeouts.selector 
    });

    // 3. Заполняем поле "Имя" (берем последнее совпадение - из модального окна)
    const nameInput = page.locator('input[name="name"][placeholder="Имя"]').last();
    await nameInput.click();
    await nameInput.fill('Strive Test');
    console.log('Введено имя: Strive Test');

    // 4. Заполняем поле "Телефон"
    const phoneInput = page.locator('input[name="phone"][placeholder="Телефон"]').last();
    await phoneInput.click();
    await phoneInput.fill('+79999999999');
    console.log('Введен телефон: +79999999999');
    
// 5. Закрытие плашки куки (если появилась)
try {
  console.log('🔍 Поиск кнопки закрытия плашки куки...');
  
  // Ищем кнопку, внутри которой есть SVG с характерным "крестиком"
  const acceptCookiesButton = page.locator('button:has(svg path[d*="M1 15L15 1"])');
  
  // Короткий таймаут: если плашки нет, не задерживаем тест надолго
  await acceptCookiesButton.first().waitFor({ state: 'visible', timeout: 3000 });
  await acceptCookiesButton.first().click();
  
  console.log('✅ Плашка куки закрыта');
  await page.waitForTimeout(500); // Небольшая пауза, чтобы плашка успела исчезнуть из DOM
} catch (error) {
  console.log('⚠️ Плашка куки не появилась, пропускаем');
}

   // 6. Клик на кнопку "Отправить"
   console.log('Клик по кнопке "Отправить"...');
   await page.getByRole('button', { name: 'Отправить' }).click();

    // 7. Ждем ответ от API и проверяем
    const apiResponse = await apiResponsePromise;
    const status = apiResponse.status();
    console.log(`API ответ: status=${status}, url=${apiResponse.url()}`);

    if (status === 200) {
      console.log('✅ Тест пройден: API вернул 200 OK');
      const body = await apiResponse.json().catch(() => null);
      if (body) console.log('Тело ответа:', JSON.stringify(body));
    } else {
      console.error(`❌ Тест провален: ожидаемый статус 200, получен ${status}`);
      process.exit(1);
    }

    // Небольшая пауза перед закрытием браузера, чтобы успели пройти все сетевые запросы
    await page.waitForTimeout(1000);

  } catch (error) {
    console.error('❌ Ошибка в тесте:', error.message);
    await page.screenshot({ path: 'error_zapros_demo.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();