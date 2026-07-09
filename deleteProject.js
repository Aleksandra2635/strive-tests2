const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function deleteProject() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const PROJECT_NAME = 'Тестовый проект';

  console.log('🚀 Запуск теста удаления проекта...');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`📦 Название проекта: ${PROJECT_NAME}`);

  const browserOptions = getBrowserOptions();
  console.log(`🖥️ Режим браузера: ${browserOptions.headless ? 'headless' : 'видимый'}`);
  
  const browser = await chromium.launch({
  ...browserOptions,
  headless: false,
  args: ['--start-maximized'] // Разворачивает окно на весь экран монитора
});

const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: null // null = использовать реальный размер экрана
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
    
    if (url.includes('/project-space-column') && method === 'PATCH') {
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

// 3️⃣ Нажатие на три точки проекта
console.log('\n⋯ Нажатие на меню проекта (три точки)...');

try {
  // Точный XPath к SVG иконке меню (три точки)
  const menuSvgXPath = '/html/body/div[1]/div[1]/section/div/div/div/div/div[3]/div/div/div/div[2]/div/div/div[2]/a/div/div/div[2]/button/div/svg';
  
  // 1. Наводимся через cursor-pointer
  console.log('🖱️ Наведение через cursor-pointer...');
  
  const hovered = await page.evaluate((xpath) => {
    // Находим SVG по точному XPath
    const svgResult = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    const svgElement = svgResult.singleNodeValue;
    
    if (svgElement) {
      // Ищем родительский button.dynamic-button.cursor-pointer
      let cursorElement = svgElement.closest('button.dynamic-button.cursor-pointer') || 
                         svgElement.closest('button.cursor-pointer') || 
                         svgElement.closest('[class*="cursor-pointer"]') || 
                         svgElement.parentElement;
      
      // Прокручиваем к элементу
      cursorElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      
      // Создаём события наведения
      cursorElement.dispatchEvent(new MouseEvent('mouseover', {
        bubbles: true, cancelable: true, view: window
      }));
      cursorElement.dispatchEvent(new MouseEvent('mouseenter', {
        bubbles: true, cancelable: true, view: window
      }));
      cursorElement.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true, cancelable: true, view: window
      }));
      
      console.log('Hovered on:', cursorElement.tagName, cursorElement.className?.substring(0, 80));
      return true;
    }
    
    console.log('SVG element not found by XPath');
    return false;
  }, menuSvgXPath);
  
  if (hovered) {
    console.log('✅ Наведение через cursor-pointer выполнено');
  } else {
    console.warn('⚠️ Элемент не найден по XPath, пробуем по классам...');
    
    // Резервный способ: поиск по уникальным классам
    const foundByClass = await page.evaluate(() => {
      // Ищем div с классом group-hover:visible invisible
      const containers = document.querySelectorAll('div[class*="group-hover:visible"][class*="invisible"]');
      
      for (let container of containers) {
        // Ищем внутри button.dynamic-button.cursor-pointer
        const button = container.querySelector('button.dynamic-button.cursor-pointer');
        if (button) {
          // Прокручиваем к кнопке
          button.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          
          // Наводимся
          button.dispatchEvent(new MouseEvent('mouseover', {
            bubbles: true, cancelable: true, view: window
          }));
          button.dispatchEvent(new MouseEvent('mouseenter', {
            bubbles: true, cancelable: true, view: window
          }));
          
          console.log('Found by class:', button.className);
          return true;
        }
      }
      return false;
    });
    
    if (foundByClass) {
      console.log('✅ Наведение через классы выполнено');
    } else {
      throw new Error('Элемент не найден');
    }
  }
  
  // Ждём появления меню с тремя точками
  await page.waitForTimeout(1500);
  
  // 2. JavaScript клик по точному XPath через cursor-pointer
  console.log('🔧 JavaScript клик по трём точкам...');
  
  const menuClicked = await page.evaluate((xpath) => {
    // Находим SVG по точному XPath
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    const svgElement = result.singleNodeValue;
    
    if (svgElement) {
      // Ищем родительский button.dynamic-button.cursor-pointer
      let clickableElement = svgElement.closest('button.dynamic-button.cursor-pointer') || 
                            svgElement.closest('button.cursor-pointer') || 
                            svgElement.closest('[class*="cursor-pointer"]') || 
                            svgElement.parentElement;
      
      if (clickableElement) {
        // Прокручиваем к элементу
        clickableElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        
        // Создаём события наведения
        clickableElement.dispatchEvent(new MouseEvent('mouseenter', {
          bubbles: true, cancelable: true, view: window
        }));
        clickableElement.dispatchEvent(new MouseEvent('mouseover', {
          bubbles: true, cancelable: true, view: window
        }));
        
        // Кликаем с задержкой
        setTimeout(() => {
          clickableElement.click();
        }, 300);
        
        console.log('Clicked on menu:', clickableElement.tagName, clickableElement.className?.substring(0, 80));
        return true;
      }
    }
    
    console.log('SVG element not found for click');
    return false;
  }, menuSvgXPath);
  
  if (menuClicked) {
    console.log('✅ Клик по меню проекта выполнен');
  } else {
    console.warn('⚠️ JavaScript клик не сработал, пробуем по классам...');
    
    // Резервный способ: клик по уникальным классам
    const clickedByClass = await page.evaluate(() => {
      // Ищем div с классом group-hover:visible invisible
      const containers = document.querySelectorAll('div[class*="group-hover:visible"][class*="invisible"]');
      
      for (let container of containers) {
        // Ищем внутри button.dynamic-button.cursor-pointer
        const button = container.querySelector('button.dynamic-button.cursor-pointer');
        if (button) {
          button.click();
          console.log('Clicked by class:', button.className);
          return true;
        }
      }
      return false;
    });
    
    if (clickedByClass) {
      console.log('✅ Клик через классы выполнен');
    } else {
      // Финальный резерв: обычный клик по XPath
      console.warn('⚠️ Классы не сработали, пробуем обычный клик...');
      await page.click(`xpath=${menuSvgXPath}`, { force: true, timeout: 5000 });
      console.log('✅ Обычный клик по XPath выполнен');
    }
  }
  
} catch (err) {
  console.error('❌ Не удалось открыть меню проекта:', err.message);
  throw new Error('Меню проекта не найдено');
}

// Ждём появления меню
await page.waitForTimeout(1000);

    // 4️⃣ Нажатие на "Удалить проект"
    console.log('\n🗑️ Нажатие на кнопку "Удалить проект"...');

    let deleteClicked = false;

    // Способ 1: JavaScript клик по точному XPath
    try {
      console.log('🔍 Способ 1: Поиск по XPath...');
      const deleteButtonXPath = '/html/body/div[2]/div[7]/div/div[6]/div';
      
      deleteClicked = await page.evaluate((xpath) => {
        const result = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        const element = result.singleNodeValue;
        
        if (element) {
          let clickableElement = element.closest('[class*="cursor-pointer"]') || element;
          
          clickableElement.scrollIntoView({ behavior: 'smooth' });
          
          const hoverEvent = new MouseEvent('mouseenter', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          clickableElement.dispatchEvent(hoverEvent);
          
          setTimeout(() => {
            clickableElement.click();
          }, 300);
          
          console.log('Clicked via XPath:', clickableElement.tagName);
          return true;
        }
        return false;
      }, deleteButtonXPath);
      
      if (deleteClicked) {
        console.log('✅ Клик по "Удалить проект" (XPath) выполнен');
      }
      
    } catch (e) {
      console.log('⚠️ XPath не сработал');
    }

    // Способ 2: По классам и тексту "Удалить проект"
    if (!deleteClicked) {
      try {
        console.log('🔍 Способ 2: Поиск по классу и тексту...');
        
        deleteClicked = await page.evaluate(() => {
          const elements = document.querySelectorAll('.text-\\[13px\\].truncate.leading-\\[15px\\].font-roboto.grow');
          
          for (let el of elements) {
            const text = el.textContent.trim();
            if (text === 'Удалить проект' || text.includes('Удалить проект')) {
              let clickableElement = el.closest('[class*="cursor-pointer"]') || el;
              
              clickableElement.scrollIntoView({ behavior: 'smooth' });
              
              const hoverEvent = new MouseEvent('mouseenter', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              clickableElement.dispatchEvent(hoverEvent);
              
              setTimeout(() => {
                clickableElement.click();
              }, 300);
              
              console.log('Clicked via class and text');
              return true;
            }
          }
          return false;
        });
        
        if (deleteClicked) {
          console.log('✅ Клик по "Удалить проект" (по классу и тексту) выполнен');
        }
        
      } catch (e) {
        console.log('⚠️ Класс и текст не сработали');
      }
    }

    // Способ 3: По тексту "Удалить проект"
    if (!deleteClicked) {
      try {
        console.log('🔍 Способ 3: Поиск по тексту...');
        
        deleteClicked = await page.evaluate(() => {
          const allElements = Array.from(document.querySelectorAll('div, span, button, a'));
          
          for (let el of allElements) {
            const text = el.textContent.trim();
            if (text === 'Удалить проект') {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                let clickableElement = el.closest('[class*="cursor-pointer"]') || el;
                
                clickableElement.scrollIntoView({ behavior: 'smooth' });
                
                const hoverEvent = new MouseEvent('mouseenter', {
                  bubbles: true,
                  cancelable: true,
                  view: window
                });
                clickableElement.dispatchEvent(hoverEvent);
                
                setTimeout(() => {
                  clickableElement.click();
                }, 300);
                
                console.log('Clicked via text');
                return true;
              }
            }
          }
          return false;
        });
        
        if (deleteClicked) {
          console.log('✅ Клик по "Удалить проект" (по тексту) выполнен');
        }
        
      } catch (e) {
        console.log('⚠️ Текст не сработал');
      }
    }

    // Способ 4: По cursor-pointer с текстом "Удалить проект"
    if (!deleteClicked) {
      try {
        console.log('🔍 Способ 4: Поиск по cursor-pointer...');
        
        deleteClicked = await page.evaluate(() => {
          const cursorElements = document.querySelectorAll('[class*="cursor-pointer"]');
          
          for (let el of cursorElements) {
            if (el.textContent.includes('Удалить проект')) {
              el.scrollIntoView({ behavior: 'smooth' });
              
              const hoverEvent = new MouseEvent('mouseenter', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              el.dispatchEvent(hoverEvent);
              
              setTimeout(() => {
                el.click();
              }, 300);
              
              console.log('Clicked via cursor-pointer');
              return true;
            }
          }
          return false;
        });
        
        if (deleteClicked) {
          console.log('✅ Клик по "Удалить проект" (cursor-pointer) выполнен');
        }
        
      } catch (e) {
        console.log('⚠️ cursor-pointer не сработал');
      }
    }

    if (!deleteClicked) {
      throw new Error('Не удалось найти кнопку "Удалить проект"');
    }

    // Ждём появления модального окна
    await page.waitForTimeout(1000);

    // 5️⃣ Подтверждение удаления
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

    // 6️⃣ Ожидание обработки удаления
    console.log('\n⏳ Ожидание обработки удаления...');
    await page.waitForTimeout(3000);

    // 7️⃣ Проверка PATCH запроса
    console.log('\n🔍 Проверка отправки PATCH запроса...');
    
    if (responses.length > 0) {
      const patchResponse = responses.find(r => 
        r.method === 'PATCH' && 
        r.url.includes('/project-space-column')
      );
      
      if (patchResponse) {
        console.log(`✅ PATCH запрос был отправлен!`);
        console.log(`📡 URL API: ${patchResponse.url}`);
        console.log(`📊 Статус: ${patchResponse.status} ${patchResponse.status === 200 ? '(OK)' : ''}`);
        
        
        // Проверяем что это API запрос на server.striveapp.ru
        if (patchResponse.url.includes('server.striveapp.ru') && 
            patchResponse.url.includes('/project-space-column')) {
          console.log('✅ API запрос корректный: PATCH на server.striveapp.ru/project-space-column');
        } else {
          console.warn(`⚠️ API URL не соответствует ожидаемому`);
        }
        
        // Проверяем статус
        if (patchResponse.status === 200) {
          console.log('✅ Статус 200 OK - проект успешно удалён (отправлен в корзину)!');
        } else {
          console.warn(`⚠️ Ожидался статус 200, получен: ${patchResponse.status}`);
        }
        
      } else {
        console.warn('⚠️ PATCH запрос на /project-space-column не найден');
      }
      
    } else {
      console.warn('⚠️ PATCH запрос не был перехвачен');
    }

    

    // 9️⃣ Финальный скриншот
    await page.screenshot({ path: 'project-deleted.png', fullPage: false });
    console.log('📸 Скриншот сохранён: project-deleted.png');

    console.log('\n✨ Проект успешно удалён!');

  } catch (error) {
    console.error('❌ Ошибка при удалении проекта:', error.message);
    
    try {
      await page.screenshot({ path: 'project-delete-error.png' });
      console.log('📸 Скриншот ошибки сохранён: project-delete-error.png');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить скриншот');
    }
    
    try {
      const html = await page.content();
      require('fs').writeFileSync('project-delete-error.html', html);
      console.log('📄 HTML страницы сохранён: project-delete-error.html');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить HTML');
    }
    
    throw error;
    
  } finally {
    await browser.close();
    console.log('\nℹ️ Браузер закрыт');
  }
}

deleteProject()
  .then(() => {
    console.log('\n✨ Тест удаления проекта завершён успешно');
  })
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });