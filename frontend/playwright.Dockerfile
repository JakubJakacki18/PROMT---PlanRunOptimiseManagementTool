# Oficjalny obraz Playwright z przeglądarkami wbudowanymi
FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

# Kopiujemy pliki zależności
COPY package.json package-lock.json ./

# Instalujemy zależności projektu (bez strict lockfile, bo dodajemy playwright)
RUN npm install --ignore-scripts

# Doinstalowujemy @playwright/test (nie ma go jeszcze w package.json)
RUN npm install --save-dev @playwright/test

# Kopiujemy resztę: testy e2e, playwright.config.ts, itd.
COPY playwright.config.ts ./
COPY tests/ ./tests/

# Tworzymy katalog na stan uwierzytelnienia (storageState)
RUN mkdir -p playwright/.auth

# Domyślna komenda
CMD ["npx", "playwright", "test", "--reporter=list"]
