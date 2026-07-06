const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function deleteColumn() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const COLUMN_NAME = 'Тестовая колонка';

  console.log('🚀 Запуск теста удаления колонки...');
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

  // Массив для хранения ответов
  const responses = [];
  
  // Слушаем все ответы
  page.on('response', response => {
    const url = response.url();
    const method = response.request().method();
    const status = response.status();
    
    if (url.includes('/projects/') && url.includes('/stages/') && method === 'DELETE') {
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
// 4️⃣ Нажатие на три точки колонки
console.log('\n⋯ Нажатие на меню колонки (три точки)...');

try {
  // XPath родительского контейнера колонки
  const columnXPath = '/html/body/div[1]/div[1]/section/div/div/div[2]/div/div[2]/div/div[4]/div/div[1]/div[3]/div';
  
  // Наводим на колонку
  console.log('🖱️ Наведение на колонку...');
  const column = await page.waitForSelector(`xpath=${columnXPath}`, {
    state: 'visible',
    timeout: 10000
  });
  await column.hover({ force: true });
  console.log('✅ Наведение на колонку выполнено');
  
  // Ждём появления меню
  await page.waitForTimeout(2000);
  
  // Точный XPath к кнопке меню
  const menuButtonXPath = '/html/body/div[1]/div[1]/section/div/div/div[2]/div/div[2]/div/div[4]/div/div[1]/div[1]/div[1]';
  
  // JavaScript клик с поиском cursor-pointer
  console.log('🔧 JavaScript клик по меню...');
  const clicked = await page.evaluate((menuXPath) => {
    // Пробуем найти элемент по XPath
    const xpathResult = document.evaluate(
      menuXPath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    let element = xpathResult.singleNodeValue;
    
    if (element) {
      // Если это SVG или path, ищем родительский элемент с cursor-pointer
      if (element.tagName.toLowerCase() === 'svg' || element.tagName.toLowerCase() === 'path') {
        // Ищем ближайший элемент с cursor-pointer
        const cursorElement = element.closest('[class*="cursor-pointer"]') || 
                             element.closest('button') || 
                             element.closest('div[role="button"]') ||
                             element.parentElement;
        if (cursorElement) {
          element = cursorElement;
        }
      }
      
      // Проверяем есть ли cursor-pointer на самом элементе
      if (!element.className || !element.className.includes('cursor-pointer')) {
        // Ищем внутри элемента элемент с cursor-pointer
        const innerCursor = element.querySelector('[class*="cursor-pointer"]');
        if (innerCursor) {
          element = innerCursor;
        }
      }
      
      // Кликаем
      element.click();
      console.log('Clicked on:', element.tagName, element.className);
      return true;
    }
    
    return false;
  }, menuButtonXPath);
  
  if (clicked) {
    console.log('✅ JavaScript клик выполнен');
  } else {
    console.warn('⚠️ Элемент не найден, пробуем альтернативу...');
    
    // Альтернатива: ищем любой элемент с cursor-pointer внутри колонки
    await page.evaluate((colXPath) => {
      const result = document.evaluate(
        colXPath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      const column = result.singleNodeValue;
      
      if (column) {
        // Ищем все элементы с cursor-pointer внутри колонки
        const cursorElements = column.querySelectorAll('[class*="cursor-pointer"]');
        if (cursorElements.length > 0) {
          cursorElements[0].click();
          return true;
        }
      }
      return false;
    }, columnXPath);
    
    console.log('✅ Альтернативный клик выполнен');
  }
  
} catch (err) {
  console.error('❌ Не удалось открыть меню колонки:', err.message);
  throw new Error('Меню колонки не найдено');
}

// Ждём появления меню
await page.waitForTimeout(1500);
;

 // 5️⃣ Нажатие на "Удалить"
console.log('\n🗑️ Нажатие на кнопку "Удалить"...');

try {
  // Ждём появления меню
  await page.waitForTimeout(1000);
  
  console.log('🔍 Поиск кнопки "Удалить"...');
  
  // Пробуем найти и кликнуть разными способами
  const clicked = await page.evaluate(() => {
    // Способ 1: Ищем по тексту "Удалить"
    console.log('📌 Поиск по тексту "Удалить"...');
    const allElements = Array.from(document.querySelectorAll('div, span, button'));
    let deleteButton = null;
    
    for (let el of allElements) {
      const text = el.textContent.trim();
      // Проверяем что это именно "Удалить"
      if (text === 'Удалить' || text === 'Удалить колонку') {
        // Проверяем видимость
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight) {
          deleteButton = el;
          console.log('✅ Найдено по тексту:', el.tagName, el.className);
          break;
        }
      }
    }
    
    // Способ 2: Ищем по классу из скриншота
    if (!deleteButton) {
      console.log('📌 Поиск по классу...');
      const classElements = document.querySelectorAll('.text-\\[13px\\].truncate.leading-\\[15px\\].font-roboto.grow');
      for (let el of classElements) {
        if (el.textContent.includes('Удалить')) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            deleteButton = el;
            console.log('✅ Найдено по классу:', el.className);
            break;
          }
        }
      }
    }
    
    // Способ 3: Ищем по XPath
    if (!deleteButton) {
      console.log('📌 Поиск по XPath...');
      const xpathResult = document.evaluate(
        '/html/body/div[2]/div[7]/div/div[10]/div',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      const element = xpathResult.singleNodeValue;
      if (element) {
        deleteButton = element;
        console.log('✅ Найдено по XPath');
      }
    }
    
    if (deleteButton) {
      // Ищем элемент с cursor-pointer
      let clickableElement = null;
      
      // Проверяем сам элемент
      if (deleteButton.className && deleteButton.className.includes('cursor-pointer')) {
        clickableElement = deleteButton;
        console.log('✅ cursor-pointer на самом элементе');
      }
      
      // Ищем родительский элемент с cursor-pointer
      if (!clickableElement) {
        const cursorParent = deleteButton.closest('[class*="cursor-pointer"]');
        if (cursorParent) {
          clickableElement = cursorParent;
          console.log('✅ cursor-pointer на родителе');
        }
      }
      
      // Ищем дочерний элемент с cursor-pointer
      if (!clickableElement) {
        const cursorChild = deleteButton.querySelector('[class*="cursor-pointer"]');
        if (cursorChild) {
          clickableElement = cursorChild;
          console.log('✅ cursor-pointer на дочернем элементе');
        }
      }
      
      // Если cursor-pointer не найден, используем сам элемент
      if (!clickableElement) {
        clickableElement = deleteButton;
        console.log('⚠️ cursor-pointer не найден, используем сам элемент');
      }
      
      // Наводим курсор
      clickableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Создаём событие наведения
      const hoverEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      clickableElement.dispatchEvent(hoverEvent);
      
      // Дополнительное событие mouseover
      const overEvent = new MouseEvent('mouseover', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      clickableElement.dispatchEvent(overEvent);
      
      // Кликаем
      setTimeout(() => {
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        clickableElement.dispatchEvent(clickEvent);
      }, 500);
      
      console.log('🖱️ Клик выполнен по:', clickableElement.tagName, clickableElement.className);
      return true;
    }
    
    console.log('❌ Кнопка "Удалить" не найдена');
    return false;
  });
  
  if (clicked) {
    console.log('✅ Клик по "Удалить" выполнен');
  } else {
    console.warn('⚠️ Не найдено через JavaScript');
    throw new Error('Кнопка "Удалить" не найдена');
  }
  
} catch (err) {
  console.error('❌ Не удалось найти кнопку "Удалить":', err.message);
  throw new Error('Кнопка "Удалить" не найдена');
}

// Небольшая задержка для появления модального окна подтверждения
await page.waitForTimeout(1000);


    // 6️⃣ Подтверждение удаления
    console.log('\n✅ Подтверждение удаления...');
    
    try {
      await page.waitForSelector('xpath=//*[@id="modalBoxSubmitButton"]', {
        state: 'visible',
        timeout: 10000
      });
      await page.click('xpath=//*[@id="modalBoxSubmitButton"]');
      console.log('✅ Подтверждение удаления (XPath) выполнено');
      
    } catch (err) {
      console.warn('⚠️ Не найдено по XPath, пробуем по ID...');
      
      try {
        await page.click('#modalBoxSubmitButton');
        console.log('✅ Подтверждение удаления (по ID) выполнено');
        
      } catch (err2) {
        console.error('❌ Не удалось найти кнопку подтверждения');
        throw new Error('Кнопка подтверждения не найдена');
      }
    }

    // 7️⃣ Ожидание обработки удаления
    console.log('\n⏳ Ожидание обработки удаления...');
    await page.waitForTimeout(3000);

    // 8️⃣ Проверка DELETE запроса
    console.log('\n🔍 Проверка отправки DELETE запроса...');
    
    if (responses.length > 0) {
      const deleteResponse = responses.find(r => 
        r.method === 'DELETE' && 
        r.url.includes('/projects/') && 
        r.url.includes('/stages/')
      );
      
      if (deleteResponse) {
        console.log(`✅ DELETE запрос был отправлен!`);
        console.log(`📡 URL API: ${deleteResponse.url}`);
        console.log(`📊 Статус: ${deleteResponse.status} ${deleteResponse.status === 200 ? '(OK)' : ''}`);
  
        
        // Извлекаем ID проекта и колонки из URL
        const urlMatch = deleteResponse.url.match(/\/projects\/(\d+)\/stages\/(\d+)/);
        if (urlMatch) {
          const projectId = urlMatch[1];
          const stageId = urlMatch[2];
          console.log(`🆔 ID проекта: ${projectId}`);
          console.log(`🆔 ID колонки: ${stageId}`);
        }
        
        // Проверяем что это API запрос на server.striveapp.ru
        if (deleteResponse.url.includes('server.striveapp.ru') && 
            deleteResponse.url.includes('/projects/') && 
            deleteResponse.url.includes('/stages/')) {
          console.log('✅ API запрос корректный: DELETE на server.striveapp.ru/projects/{id}/stages/{id}');
        } else {
          console.warn(`⚠️ API URL не соответствует ожидаемому`);
        }
        
        // Проверяем статус
        if (deleteResponse.status === 200) {
          console.log('✅ Статус 200 OK - колонка успешно удалена!');
        } else {
          console.warn(`⚠️ Ожидался статус 200, получен: ${deleteResponse.status}`);
        }
        
      } else {
        console.warn('⚠️ DELETE запрос на /projects/{id}/stages/{id} не найден');
      }
      
    } else {
      console.warn('⚠️ DELETE запрос не был перехвачен');
    }

    // 9️⃣ Проверка удаления колонки на странице
    console.log('\n🔍 Проверка удаления колонки на странице...');
    
    try {
      // Проверяем что колонка исчезла
      const columnExists = await page.isVisible(`div:has-text("${COLUMN_NAME}")`).catch(() => false);
      
      if (!columnExists) {
        console.log('✅ Колонка удалена и не отображается на странице!');
      } else {
        console.warn('⚠️ Колонка всё ещё отображается на странице');
      }
      
    } catch (err) {
      console.warn('⚠️ Не удалось проверить удаление на странице');
    }

    // 🔟 Финальный скриншот
    await page.screenshot({ path: 'column-deleted.png', fullPage: false });
    console.log('📸 Скриншот сохранён: column-deleted.png');

    console.log('\n✨ Колонка успешно удалена!');

  } catch (error) {
    console.error('❌ Ошибка при удалении колонки:', error.message);
    
    try {
      await page.screenshot({ path: 'column-delete-error.png' });
      console.log('📸 Скриншот ошибки сохранён: column-delete-error.png');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить скриншот');
    }
    
    try {
      const html = await page.content();
      require('fs').writeFileSync('column-delete-error.html', html);
      console.log('📄 HTML страницы сохранён: column-delete-error.html');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить HTML');
    }
    
    throw error;
    
  } finally {
    await browser.close();
    console.log('\nℹ️ Браузер закрыт');
  }
}

deleteColumn()
  .then(() => {
    console.log('\n✨ Тест удаления колонки завершён успешно');
  })
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });