const { chromium } = require('playwright');
const { sendSuccess, sendError } = require('./telegram');
const { getBrowserOptions } = require('./browserConfig');
require('dotenv').config();

async function deleteUserTest() {
  const USER_EMAIL = process.env.USER_EMAIL;
  const USER_PASSWORD = process.env.USER_PASSWORD;
  const CONFIRMATION_EMAIL = 'aleksa2635@yandex.com';

  console.log('🚀 Запуск теста удаления пользователя...');
  console.log(`📧 Email для входа: ${USER_EMAIL}`);
  console.log(`📧 Email для подтверждения: ${CONFIRMATION_EMAIL}`);

  const browserOptions = getBrowserOptions();

  console.log(
    `🖥️ Режим браузера: ${
      browserOptions.headless ? 'headless' : 'видимый'
    }`
  );

  // В видимом режиме замедляем действия Playwright,
  // чтобы можно было глазами следить за тестом.
  if (!browserOptions.headless) {
    browserOptions.slowMo = 700;
    console.log('🐢 Визуальный режим: slowMo = 700 мс');
  }

  const browser = await chromium.launch(browserOptions);

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: {
      width: 1920,
      height: 1080
    }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  // Дополнительные паузы только в видимом режиме.
  const visualPause = async (ms = 1000) => {
    if (!browserOptions.headless) {
      await page.waitForTimeout(ms);
    }
  };

  try {
    // 1️⃣ Открытие страницы входа
    console.log('\n🌐 Открытие страницы входа...');

    await page.goto(
      'https://app.striveapp.ru/login',
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }
    );

    console.log(
      '✅ Страница входа загружена'
    );

    await visualPause(1000);

    // 2️⃣ Ожидание появления поля email
    console.log(
      '⏳ Ожидание поля ввода email...'
    );

    await page.waitForSelector(
      '[name="email"]',
      {
        state: 'visible',
        timeout: 30000
      }
    );

    // 3️⃣ Ввод данных
    console.log(
      '📝 Ввод email...'
    );

    await page.fill(
      '[name="email"]',
      USER_EMAIL
    );

    await visualPause(500);

    console.log(
      '📝 Ввод пароля...'
    );

    await page.fill(
      '[name="password"]',
      USER_PASSWORD
    );

    await visualPause(1000);

    // 4️⃣ Клик по кнопке "Продолжить"
    console.log(
      '🖱️ Нажатие кнопки "Продолжить"...'
    );

    await page.waitForSelector(
      'button[type="submit"]',
      {
        state: 'visible',
        timeout: 15000
      }
    );

    await page.click(
      'button[type="submit"]'
    );

    // 5️⃣ Ожидание успешного входа
    console.log(
      '⏳ Ожидание завершения входа...'
    );

    await page.waitForURL(
      /(\/main|\/dashboard|\/workspace)/,
      {
        timeout: 45000
      }
    );

    console.log(
      '✅ Вход успешно выполнен!'
    );

    console.log(
      `🏠 Текущий URL: ${page.url()}`
    );

    await visualPause(1500);

    // 6️⃣ Переход в профиль
    console.log(
      '\n👤 Переход в раздел профиля...'
    );

    let profileClicked = false;

    // Способ 1: По классам
    try {
      console.log(
        '🔍 Поиск меню профиля по классам...'
      );

      await page.waitForSelector(
        'div.flex.flex-row.gap-[6px].transition.duration-300.ease-in-out.h-[58px].justify-end',
        {
          state: 'visible',
          timeout: 10000
        }
      );

      await visualPause(1000);

      console.log(
        '🖱️ Открытие меню профиля...'
      );

      await page.click(
        'div.flex.flex-row.gap-[6px].transition.duration-300.ease-in-out.h-[58px].justify-end'
      );

      console.log(
        '✅ Клик по меню профиля выполнен (по классам)'
      );

      profileClicked = true;

    } catch (err) {
      console.warn(
        '⚠️ Не удалось найти меню профиля по классам, пробуем XPath...'
      );
    }

    // Способ 2: По XPath
    if (!profileClicked) {
      try {
        console.log(
          '🔍 Поиск меню профиля по XPath...'
        );

        const xpathSelector =
          '/html/body/div[1]/div[1]/section/aside/div[1]/div[1]/a/div';

        await page
          .locator(
            `xpath=${xpathSelector}`
          )
          .waitFor({
            state: 'visible',
            timeout: 10000
          });

        await visualPause(1000);

        await page
          .locator(
            `xpath=${xpathSelector}`
          )
          .click();

        console.log(
          '✅ Клик по меню профиля выполнен (по XPath)'
        );

        profileClicked = true;

      } catch (err) {
        console.error(
          '❌ Не удалось найти меню профиля ни по классам, ни по XPath'
        );

        throw new Error(
          'Не удалось найти меню профиля'
        );
      }
    }

    await visualPause(2000);

    // Проверяем, что меню открылось
    const isMenuOpen =
      await page.isVisible(
        'text="Настройки"'
      );

    if (isMenuOpen) {
      console.log(
        '✅ Меню профиля открыто'
      );
    } else {
      console.warn(
        '⚠️ Меню профиля может быть открыто, но не виден элемент "Настройки"'
      );
    }

    // 7️⃣ Переход в настройки
    console.log(
      '\n⚙️ Переход в настройки...'
    );

    let settingsClicked = false;

    // Способ 1: XPath
    try {
      const xpathSelector =
        '/html/body/div[2]/div[1]/div/div/div[2]/div[1]/div[2]';

      console.log(
        '🔍 Способ 1: Поиск по XPath...'
      );

      await page
        .locator(
          `xpath=${xpathSelector}`
        )
        .waitFor({
          state: 'visible',
          timeout: 10000
        });

      await visualPause(1000);

      await page
        .locator(
          `xpath=${xpathSelector}`
        )
        .click();

      console.log(
        '✅ Клик по "Настройки" выполнен (по XPath)'
      );

      settingsClicked = true;

    } catch (err) {
      console.log(
        '⚠️ XPath не сработал'
      );
    }

    // Способ 2: По классам
    if (!settingsClicked) {
      try {
        console.log(
          '🔍 Способ 2: Поиск по классу...'
        );

        const clicked =
          await page.evaluate(() => {
            const elements =
              document.querySelectorAll(
                '.text-\\[13px\\].truncate.leading-\\[15px\\].font-roboto.grow'
              );

            for (const el of elements) {
              if (
                el.textContent.trim() ===
                'Настройки'
              ) {
                const clickableElement =
                  el.closest(
                    '[class*="cursor-pointer"]'
                  ) || el;

                clickableElement.scrollIntoView({
                  behavior: 'smooth'
                });

                const hoverEvent =
                  new MouseEvent(
                    'mouseenter',
                    {
                      bubbles: true,
                      cancelable: true,
                      view: window
                    }
                  );

                clickableElement.dispatchEvent(
                  hoverEvent
                );

                clickableElement.click();

                return true;
              }
            }

            return false;
          });

        if (clicked) {
          console.log(
            '✅ Клик по "Настройки" выполнен (по классу)'
          );

          settingsClicked = true;
        }

      } catch (err) {
        console.log(
          '⚠️ Класс не сработал'
        );
      }
    }

    // Способ 3: По тексту
    if (!settingsClicked) {
      try {
        console.log(
          '🔍 Способ 3: Поиск по тексту...'
        );

        const clicked =
          await page.evaluate(() => {
            const allElements =
              Array.from(
                document.querySelectorAll(
                  'div, span, button, a'
                )
              );

            for (const el of allElements) {
              const text =
                el.textContent.trim();

              if (text === 'Настройки') {
                const rect =
                  el.getBoundingClientRect();

                if (
                  rect.width > 0 &&
                  rect.height > 0
                ) {
                  const clickableElement =
                    el.closest(
                      '[class*="cursor-pointer"]'
                    ) || el;

                  clickableElement.scrollIntoView({
                    behavior: 'smooth'
                  });

                  clickableElement.click();

                  return true;
                }
              }
            }

            return false;
          });

        if (clicked) {
          console.log(
            '✅ Клик по "Настройки" выполнен (по тексту)'
          );

          settingsClicked = true;
        }

      } catch (err) {
        console.log(
          '⚠️ Текст не сработал'
        );
      }
    }

    // Способ 4: cursor-pointer
    if (!settingsClicked) {
      try {
        console.log(
          '🔍 Способ 4: Поиск по cursor-pointer...'
        );

        const clicked =
          await page.evaluate(() => {
            const cursorElements =
              document.querySelectorAll(
                '[class*="cursor-pointer"]'
              );

            for (const el of cursorElements) {
              if (
                el.textContent.includes(
                  'Настройки'
                )
              ) {
                el.scrollIntoView({
                  behavior: 'smooth'
                });

                el.click();

                return true;
              }
            }

            return false;
          });

        if (clicked) {
          console.log(
            '✅ Клик по "Настройки" выполнен (cursor-pointer)'
          );

          settingsClicked = true;
        }

      } catch (err) {
        console.log(
          '⚠️ cursor-pointer не сработал'
        );
      }
    }

    if (!settingsClicked) {
      console.error(
        '❌ Не удалось найти кнопку "Настройки"'
      );

      throw new Error(
        'Не удалось найти кнопку "Настройки"'
      );
    }

    await visualPause(2000);

    // Исходная функциональная задержка.
    await page.waitForTimeout(1000);

    // 8️⃣ Нажатие на "Безопасность"
    console.log(
      '\n🔐 Нажатие на кнопку "Безопасность"...'
    );

    try {
      await page.waitForSelector(
        'text=Безопасность',
        {
          state: 'visible',
          timeout: 15000
        }
      );

      await visualPause(1500);

      console.log(
        '🖱️ Переход в "Безопасность"...'
      );

      await page.click(
        'text=Безопасность'
      );

      console.log(
        '✅ Клик по "Безопасность" выполнен'
      );

    } catch (err) {
      console.error(
        '❌ Не удалось найти кнопку "Безопасность"'
      );

      throw new Error(
        'Не удалось найти кнопку "Безопасность"'
      );
    }

    await visualPause(2000);

    // 9️⃣ Нажатие на "Удалить аккаунт"
    console.log(
      '\n🗑️ Нажатие на кнопку "Удалить аккаунт"...'
    );

    try {
      await page.waitForSelector(
        'text=Удалить аккаунт',
        {
          state: 'visible',
          timeout: 15000
        }
      );

      await visualPause(1500);

      console.log(
        '🖱️ Нажатие "Удалить аккаунт"...'
      );

      await page.click(
        'text=Удалить аккаунт'
      );

      console.log(
        '✅ Клик по "Удалить аккаунт" выполнен'
      );

    } catch (err) {
      console.error(
        '❌ Не удалось найти кнопку "Удалить аккаунт"'
      );

      throw new Error(
        'Не удалось найти кнопку "Удалить аккаунт"'
      );
    }

    // Даём увидеть открывшуюся модалку.
    await visualPause(2500);

    // Исходная функциональная задержка.
    await page.waitForTimeout(1000);

    // 🔟 Ввод email для подтверждения
    console.log(
      '\n📧 Ввод email для подтверждения удаления...'
    );

    try {
      const confirmationInput =
        'input[placeholder="Введите Ваш email для подтверждения"]';

      await page.waitForSelector(
        confirmationInput,
        {
          state: 'visible',
          timeout: 10000
        }
      );

      console.log(
        '✅ Поле подтверждения найдено'
      );

      await visualPause(1000);

      console.log(
        `⌨️ Ввод подтверждающего email: ${CONFIRMATION_EMAIL}`
      );

      await page.fill(
        confirmationInput,
        CONFIRMATION_EMAIL
      );

      console.log(
        `✅ Введен email для подтверждения: ${CONFIRMATION_EMAIL}`
      );

    } catch (err) {
      console.error(
        '❌ Не удалось найти поле ввода email'
      );

      throw new Error(
        'Не удалось найти поле ввода email'
      );
    }

    // Оставляем заполненную модалку на экране,
    // чтобы было видно, что именно будет подтверждено.
    await visualPause(2500);

    // 1️⃣1️⃣ Нажатие кнопки подтверждения удаления
    console.log(
      '\n⚠️ Нажатие кнопки подтверждения удаления...'
    );

    try {
      const xpathSelector =
        '//*[@id="modalBoxSubmitButton"]';

      console.log(
        `🔍 Поиск кнопки подтверждения удаления по XPath: ${xpathSelector}`
      );

      const confirmButton =
        page.locator(
          `xpath=${xpathSelector}`
        );

      await confirmButton.waitFor({
        state: 'visible',
        timeout: 10000
      });

      console.log(
        '✅ Кнопка подтверждения удаления найдена'
      );

      // Самая критичная точка теста:
      // оставляем кнопку перед глазами чуть дольше.
      await visualPause(3000);

      console.log(
        '🗑️ Подтверждение удаления аккаунта...'
      );

      await confirmButton.click();

      console.log(
        '✅ Клик по кнопке подтверждения удаления выполнен'
      );

      console.log(
        '⏳ Ожидание удаления пользователя...'
      );

      await page.waitForURL(
        'https://app.striveapp.ru/login',
        {
          timeout: 20000
        }
      );

      console.log(
        '✅ Пользователь успешно удален и перенаправлен на страницу логина!'
      );

      console.log(
        `📍 URL страницы логина: ${page.url()}`
      );

    } catch (err) {
      console.error(
        '❌ Не удалось подтвердить удаление пользователя'
      );

      throw new Error(
        'Не удалось подтвердить удаление пользователя'
      );
    }

    // Показываем итоговую страницу логина.
    await visualPause(3000);

    // 1️⃣2️⃣ Сохраняем скриншот
    await page.screenshot({
      path: 'user-deleted.png',
      fullPage: false
    });

    console.log(
      '📸 Скриншот сохранён: user-deleted.png'
    );

  } catch (error) {
    console.error(
      '\n❌ Ошибка при выполнении теста:',
      error.message
    );

    if (!page.isClosed()) {
      console.error(
        `📍 URL в момент ошибки: ${page.url()}`
      );

      // В видимом режиме оставляем экран ошибки
      // на несколько секунд.
      await visualPause(3000);

      try {
        await page.screenshot({
          path: 'error.png',
          fullPage: true
        });

        console.log(
          '📸 Скриншот ошибки сохранён: error.png'
        );

      } catch (e) {
        console.warn(
          '⚠️ Не удалось сохранить скриншот'
        );
      }

      try {
        require('fs').writeFileSync(
          'error.html',
          await page.content()
        );

        console.log(
          '📄 HTML страницы сохранён: error.html'
        );

      } catch (e) {
        console.warn(
          '⚠️ Не удалось сохранить HTML'
        );
      }
    }

    throw error;

  } finally {
    if (browser.isConnected()) {
      await browser.close();
    }

    console.log(
      '\nℹ️ Браузер закрыт'
    );
  }
}

deleteUserTest()
  .then(() => {
    console.log(
      '\n✨ Тест удаления пользователя завершён успешно'
    );
  })
  .catch(error => {
    console.error(
      '\n💥 Тест завершился с ошибкой:',
      error.message
    );

    process.exit(1);
  });