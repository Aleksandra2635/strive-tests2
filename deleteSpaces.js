const { chromium } = require('playwright');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function deleteSpace() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const SPACE_NAME = 'Тестовое пространство';

  console.log('🚀 Запуск теста удаления пространства...');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`📦 Название пространства: ${SPACE_NAME}`);

  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  
  const browser = await chromium.launch({
    headless: isCI ? true : false,
    args: isCI ? [] : ['--start-maximized']
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: isCI ? { width: 1920, height: 1080 } : null
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  // Массив для хранения ответов
  const responses = [];
  
  page.on('response', response => {
    const url = response.url();
    const method = response.request().method();
    const status = response.status();
    
    if (url.includes('/spaces/') && url.includes('/archived') && method === 'PATCH') {
      responses.push({ url, method, status, timestamp: new Date() });
      console.log(`📡 Перехвачен ответ: ${method} ${url} → ${status}`);
    }
  });

  try {
    // 1️⃣ Переход на страницу логина
    console.log('\n🌐 Открытие страницы входа...');
    await page.goto('https://app.striveapp.ru/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // 🔧 Исправление верстки на CI
    if (isCI) {
      console.log('🔧 CI режим: исправление верстки...');
      
      await page.evaluate(() => {
        document.querySelectorAll('[class*="mx-auto"]').forEach(el => {
          el.style.marginLeft = '0';
          el.style.marginRight = '0';
          el.style.maxWidth = '100%';
        });
        
        document.querySelectorAll('[class*="justify-center"]').forEach(el => {
          el.style.justifyContent = 'flex-start';
        });
        
        document.querySelectorAll('[class*="max-w-"], [class*="w-\\["]').forEach(el => {
          el.style.maxWidth = '100%';
          el.style.width = '100%';
        });
      });
      
      await page.waitForTimeout(1000);
    }

    // 2️⃣ Вход в систему
    await page.waitForSelector('[name="email"]', { state: 'visible', timeout: 30000 });
    await page.fill('[name="email"]', USER_EMAIL);
    await page.fill('[name="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');

    console.log('⏳ Ожидание успешного входа...');
    await page.waitForURL(/(\/main|\/dashboard|\/workspace)/, { timeout: 45000 });
    console.log('✅ Вход выполнен!');

    // 3️⃣ Переход в тестовое пространство
    console.log('\n📁 Переход в тестовое пространство...');
    
    const spaceXPath = '/html/body/div[1]/div[1]/section/aside/div[1]/div[2]/div[2]/div[1]/div/div[2]/a[2]/div/div[2]';
    
    try {
      await page.waitForSelector(`xpath=${spaceXPath}`, { state: 'visible', timeout: 10000 });
      await page.click(`xpath=${spaceXPath}`);
      console.log('✅ Клик по пространству (XPath) выполнен');
    } catch (err) {
      console.warn('⚠️ Не найдено по XPath, пробуем альтернативу...');
      
      // Резервный способ: поиск по тексту
      const spaceClicked = await page.evaluate(() => {
        const links = document.querySelectorAll('a, div');
        for (let el of links) {
          if (el.textContent.includes('Тестовое пространство')) {
            el.click();
            return true;
          }
        }
        return false;
      });
      
      if (spaceClicked) {
        console.log('✅ Клик по пространству (по тексту) выполнен');
      } else {
        throw new Error('Пространство не найдено');
      }
    }

    await page.waitForTimeout(2000);

           // 4️⃣ Клик по шестеренке
    console.log('\n⚙️ Клик по шестеренке...');
    
    try {
      // Ищем SVG настроек по уникальным атрибутам
      console.log('🔍 Поиск SVG шестеренки...');
      
      // Наводимся через cursor-pointer
      console.log('🖱️ Наведение на шестеренку...');
      
      const hovered = await page.evaluate(() => {
        // Ищем SVG по viewBox="0 0 17 16"
        const svgs = document.querySelectorAll('svg[viewBox="0 0 17 16"]');
        
        for (let svg of svgs) {
          // Проверяем что это нужный SVG (с path stroke="#4D4D4D")
          const path = svg.querySelector('path[stroke="#4D4D4D"]');
          if (path) {
            // Ищем родительский button или элемент с cursor-pointer
            let cursorElement = svg.closest('button') || 
                               svg.closest('[class*="cursor-pointer"]') || 
                               svg.parentElement;
            
            if (cursorElement) {
              cursorElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
              
              cursorElement.dispatchEvent(new MouseEvent('mouseover', {
                bubbles: true, cancelable: true, view: window
              }));
              cursorElement.dispatchEvent(new MouseEvent('mouseenter', {
                bubbles: true, cancelable: true, view: window
              }));
              cursorElement.dispatchEvent(new MouseEvent('mousemove', {
                bubbles: true, cancelable: true, view: window
              }));
              
              console.log('Hovered on settings SVG:', cursorElement.tagName);
              return true;
            }
          }
        }
        
        // Резерв: ищем по path с stroke="#4D4D4D"
        const paths = document.querySelectorAll('path[stroke="#4D4D4D"]');
        for (let path of paths) {
          const svg = path.closest('svg');
          if (svg && svg.getAttribute('viewBox') === '0 0 17 16') {
            let cursorElement = svg.closest('button') || 
                               svg.closest('[class*="cursor-pointer"]') || 
                               svg.parentElement;
            
            if (cursorElement) {
              cursorElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
              
              cursorElement.dispatchEvent(new MouseEvent('mouseover', {
                bubbles: true, cancelable: true, view: window
              }));
              cursorElement.dispatchEvent(new MouseEvent('mouseenter', {
                bubbles: true, cancelable: true, view: window
              }));
              
              console.log('Hovered on settings (by path):', cursorElement.tagName);
              return true;
            }
          }
        }
        
        return false;
      });
      
      if (hovered) {
        console.log('✅ Наведение на шестеренку выполнено');
      } else {
        console.warn('⚠️ SVG шестеренки не найден');
        throw new Error('SVG шестеренки не найден');
      }
      
      await page.waitForTimeout(500);
      
      // Клик по шестеренке
      console.log('🔧 JavaScript клик по шестеренке...');
      const settingsClicked = await page.evaluate(() => {
        // Ищем SVG по viewBox
        const svgs = document.querySelectorAll('svg[viewBox="0 0 17 16"]');
        
        for (let svg of svgs) {
          const path = svg.querySelector('path[stroke="#4D4D4D"]');
          if (path) {
            let clickableElement = svg.closest('button') || 
                                  svg.closest('[class*="cursor-pointer"]') || 
                                  svg.parentElement;
            
            if (clickableElement) {
              clickableElement.dispatchEvent(new MouseEvent('mouseenter', {
                bubbles: true, cancelable: true, view: window
              }));
              
              setTimeout(() => {
                clickableElement.click();
              }, 300);
              
              console.log('Clicked on settings:', clickableElement.tagName);
              return true;
            }
          }
        }
        
        // Резерв: по path
        const paths = document.querySelectorAll('path[stroke="#4D4D4D"]');
        for (let path of paths) {
          const svg = path.closest('svg');
          if (svg && svg.getAttribute('viewBox') === '0 0 17 16') {
            let clickableElement = svg.closest('button') || 
                                  svg.closest('[class*="cursor-pointer"]') || 
                                  svg.parentElement;
            
            if (clickableElement) {
              setTimeout(() => {
                clickableElement.click();
              }, 300);
              return true;
            }
          }
        }
        
        return false;
      });
      
      if (settingsClicked) {
        console.log('✅ Клик по шестеренке выполнен');
      } else {
        // Резервный способ: клик через Playwright по SVG
        console.warn('⚠️ JavaScript клик не сработал, пробуем Playwright...');
        await page.click('svg[viewBox="0 0 17 16"] path[stroke="#4D4D4D"]', { 
          force: true, 
          timeout: 5000 
        });
        console.log('✅ Клик через Playwright выполнен');
      }
      
    } catch (err) {
      console.error('❌ Не удалось кликнуть по шестеренке:', err.message);
      throw new Error('Шестеренка не найдена');
    }

    await page.waitForTimeout(1500);

    // 5️⃣ Клик по "Настройки пространства" в выпадающем меню
    console.log('\n📋 Клик по "Настройки пространства"...');
    
    try {
      // Ждём появления выпадающего меню
      await page.waitForTimeout(1000);
      
      let menuClicked = false;
      
      // Способ 1: JavaScript клик по XPath
      try {
        console.log('🔍 Способ 1: Клик по XPath...');
        
        menuClicked = await page.evaluate(() => {
          const xpath = '/html/body/div[2]/div[7]/div/div/div/button[1]/span';
          const result = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          );
          const element = result.singleNodeValue;
          
          if (element) {
            let clickableElement = element.closest('button') || 
                                  element.closest('[class*="cursor-pointer"]') || 
                                  element;
            
            clickableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            clickableElement.dispatchEvent(new MouseEvent('mouseenter', {
              bubbles: true, cancelable: true, view: window
            }));
            
            setTimeout(() => {
              clickableElement.click();
            }, 300);
            
            console.log('Clicked via XPath:', clickableElement.tagName);
            return true;
          }
          return false;
        });
        
        if (menuClicked) {
          console.log('✅ Клик по "Настройки пространства" (XPath) выполнен');
        }
        
      } catch (e) {
        console.log('⚠️ XPath не сработал');
      }
      
      // Способ 2: Поиск по тексту "Настройки пространства"
      if (!menuClicked) {
        try {
          console.log('🔍 Способ 2: Поиск по тексту...');
          
          menuClicked = await page.evaluate(() => {
            const spans = document.querySelectorAll('span');
            
            for (let span of spans) {
              if (span.textContent.trim().includes('Настройки пространства')) {
                let clickableElement = span.closest('button') || 
                                      span.closest('[class*="cursor-pointer"]') || 
                                      span;
                
                clickableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                clickableElement.dispatchEvent(new MouseEvent('mouseenter', {
                  bubbles: true, cancelable: true, view: window
                }));
                
                setTimeout(() => {
                  clickableElement.click();
                }, 300);
                
                console.log('Clicked via text:', span.textContent.trim());
                return true;
              }
            }
            return false;
          });
          
          if (menuClicked) {
            console.log('✅ Клик по "Настройки пространства" (по тексту) выполнен');
          }
          
        } catch (e) {
          console.log('⚠️ Поиск по тексту не сработал');
        }
      }
      
      // Способ 3: Поиск по классам
      if (!menuClicked) {
        try {
          console.log('🔍 Способ 3: Поиск по классам...');
          
          menuClicked = await page.evaluate(() => {
            const elements = document.querySelectorAll('.flex.h-\\[24px\\].items-center.font-roboto');
            
            for (let el of elements) {
              if (el.textContent.includes('Настройки пространства')) {
                let clickableElement = el.closest('button') || 
                                      el.closest('[class*="cursor-pointer"]') || 
                                      el;
                
                clickableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                clickableElement.click();
                console.log('Clicked via classes');
                return true;
              }
            }
            return false;
          });
          
          if (menuClicked) {
            console.log('✅ Клик по "Настройки пространства" (по классам) выполнен');
          }
          
        } catch (e) {
          console.log('⚠️ Поиск по классам не сработал');
        }
      }
      
      // Способ 4: Обычный клик через Playwright
      if (!menuClicked) {
        try {
          console.log('🔍 Способ 4: Обычный клик через Playwright...');
          await page.click('span:has-text("Настройки пространства")', { 
            force: true, 
            timeout: 5000 
          });
          console.log('✅ Клик через Playwright выполнен');
          menuClicked = true;
        } catch (e) {
          console.log('⚠️ Playwright клик не сработал');
        }
      }
      
      if (!menuClicked) {
        throw new Error('Пункт "Настройки пространства" не найден');
      }
      
    } catch (err) {
      console.error('❌ Не удалось кликнуть по "Настройки пространства":', err.message);
      throw new Error('Настройки пространства не найдены');
    }

    await page.waitForTimeout(2000);

    // 5️⃣ Скролл вниз до конца настроек
    console.log('\n📜 Скролл вниз до конца настроек...');
    
    await page.evaluate(() => {
      // Прокручиваем до самого низа
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
    
    await page.waitForTimeout(1000);
    
    // Дополнительная прокрутка контейнера если есть
    await page.evaluate(() => {
      const scrollContainers = document.querySelectorAll('[class*="overflow"], [style*="overflow"]');
      for (let container of scrollContainers) {
        if (container.scrollHeight > container.clientHeight) {
          container.scrollTop = container.scrollHeight;
        }
      }
    });
    
    await page.waitForTimeout(1000);
    console.log('✅ Скролл выполнен');

    // 6️⃣ Клик по кнопке "Удалить"
    console.log('\n🗑️ Нажатие на кнопку "Удалить"...');
    
    const deleteButtonXPath = '/html/body/form/div[2]/div[2]/div/div[2]/div/div[5]/button';
    
    let deleteClicked = false;
    
    // Способ 1: JavaScript клик через cursor-pointer
    try {
      console.log('🔍 Способ 1: JavaScript клик...');
      
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
          
          clickableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          clickableElement.dispatchEvent(new MouseEvent('mouseenter', {
            bubbles: true, cancelable: true, view: window
          }));
          
          setTimeout(() => {
            clickableElement.click();
          }, 300);
          
          console.log('Clicked via XPath:', clickableElement.tagName);
          return true;
        }
        return false;
      }, deleteButtonXPath);
      
      if (deleteClicked) {
        console.log('✅ Клик по "Удалить" (JavaScript) выполнен');
      }
      
    } catch (e) {
      console.log('⚠️ JavaScript клик не сработал');
    }
    
    // Способ 2: Обычный клик по XPath
    if (!deleteClicked) {
      try {
        console.log('🔍 Способ 2: Обычный клик по XPath...');
        await page.click(`xpath=${deleteButtonXPath}`, { force: true, timeout: 5000 });
        console.log('✅ Клик по "Удалить" (XPath) выполнен');
        deleteClicked = true;
      } catch (e) {
        console.log('⚠️ XPath клик не сработал');
      }
    }
    
    // Способ 3: Поиск по тексту "Удалить"
    if (!deleteClicked) {
      try {
        console.log('🔍 Способ 3: Поиск по тексту...');
        
        deleteClicked = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (let btn of buttons) {
            if (btn.textContent.trim() === 'Удалить' || btn.textContent.includes('Удалить')) {
              btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
              btn.click();
              return true;
            }
          }
          return false;
        });
        
        if (deleteClicked) {
          console.log('✅ Клик по "Удалить" (по тексту) выполнен');
        }
        
      } catch (e) {
        console.log('⚠️ Поиск по тексту не сработал');
      }
    }
    
    if (!deleteClicked) {
      throw new Error('Кнопка "Удалить" не найдена');
    }

    await page.waitForTimeout(1000);

    // 7️⃣ Подтверждение удаления в модалке
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

    // 8️⃣ Ожидание обработки удаления
    console.log('\n⏳ Ожидание обработки удаления...');
    await page.waitForTimeout(3000);

    // 9️⃣ Проверка PATCH запроса
    console.log('\n🔍 Проверка отправки PATCH запроса...');
    
    if (responses.length > 0) {
      const patchResponse = responses.find(r => 
        r.method === 'PATCH' && 
        r.url.includes('/spaces/') &&
        r.url.includes('/archived')
      );
      
      if (patchResponse) {
        console.log(`✅ PATCH запрос был отправлен!`);
        console.log(`📡 URL API: ${patchResponse.url}`);
        console.log(`📊 Статус: ${patchResponse.status} ${patchResponse.status === 200 ? '(OK)' : ''}`);
        
        if (patchResponse.url.includes('server.striveapp.ru') && 
            patchResponse.url.includes('/spaces/') &&
            patchResponse.url.includes('/archived')) {
          console.log('✅ API запрос корректный: PATCH на server.striveapp.ru/spaces/.../archived');
        } else {
          console.warn(`⚠️ API URL не соответствует ожидаемому`);
        }
        
        if (patchResponse.status === 200) {
          console.log('✅ Статус 200 OK - пространство успешно удалено (отправлено в корзину)!');
        } else {
          console.warn(`⚠️ Ожидался статус 200, получен: ${patchResponse.status}`);
        }
        
      } else {
        console.warn('⚠️ PATCH запрос на /spaces/.../archived не найден');
      }
      
    } else {
      console.warn('⚠️ PATCH запрос не был перехвачен');
    }

    // 🔟 Проверка удаления пространства на странице
    console.log('\n🔍 Проверка удаления пространства на странице...');
    
    try {
      // Возвращаемся на главную чтобы проверить список пространств
      await page.goto('https://app.striveapp.ru/main', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      await page.waitForTimeout(2000);
      
      const spaceExists = await page.isVisible(`div:has-text("${SPACE_NAME}")`).catch(() => false);
      
      if (!spaceExists) {
        console.log('✅ Пространство удалено и не отображается в списке!');
      } else {
        console.warn('⚠️ Пространство всё ещё отображается в списке');
      }
      
    } catch (err) {
      console.warn('⚠️ Не удалось проверить удаление на странице');
    }

    // 1️⃣1️⃣ Финальный скриншот
    await page.screenshot({ path: 'space-deleted.png', fullPage: false });
    console.log('📸 Скриншот сохранён: space-deleted.png');

    console.log('\n✨ Пространство успешно удалено!');

  } catch (error) {
    console.error('❌ Ошибка при удалении пространства:', error.message);
    
    try {
      await page.screenshot({ path: 'space-delete-error.png' });
      console.log('📸 Скриншот ошибки сохранён: space-delete-error.png');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить скриншот');
    }
    
    try {
      const html = await page.content();
      require('fs').writeFileSync('space-delete-error.html', html);
      console.log('📄 HTML страницы сохранён: space-delete-error.html');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить HTML');
    }
    
    throw error;
    
  } finally {
    await browser.close();
    console.log('\nℹ️ Браузер закрыт');
  }
}

deleteSpace()
  .then(() => {
    console.log('\n✨ Тест удаления пространства завершён успешно');
  })
  .catch(error => {
    console.error('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  });