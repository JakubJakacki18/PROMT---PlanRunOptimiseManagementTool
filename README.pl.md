# PROMT — Plan • Run • Optimise Management Tool

### Platforma wspomagająca codzienną pracę Project Managera

---

## Opis ogólny

Repozytorium zawiera **aplikację webową wspomagającą codzienną, operacyjną pracę Project Managera**. System zapewnia jedno, spójne środowisko do zarządzania projektami, zadaniami, zespołem oraz finansowaniem projektów w sposób uporządkowany, przewidywalny i możliwy do skalowania.

Projekt został zrealizowany w ramach **pracy dyplomowej inżynierskiej**. Aplikacja kładzie nacisk na **czytelny model domenowy, jednoznaczną logikę biznesową oraz warstwową architekturę systemu**, odwzorowując rzeczywiste procesy realizacji projektów, a nie uproszczone narzędzia typu task-tracker.

> 🇬🇧 English version: see [README.md](./README.md)

---

## Zakres systemu

Platforma obejmuje pełny cykl życia projektu:

- inicjalizacja i planowanie projektu
- definiowanie i przypisywanie zadań
- generowanie zadań na podstawie źródeł finansowania
- monitorowanie postępu realizacji
- raportowanie i analiza stanu projektu
- zamykanie oraz archiwizacja projektów

Wszystkie kluczowe operacje wykonywane są w jednym, zintegrowanym systemie.

---

## Model domenowy

System opiera się na trzech głównych filarach domenowych:

- **Projekt**  
  Główny kontekst pracy, agregujący zadania, finansowania, harmonogramy oraz zespół projektowy.

- **Zadanie**  
  Podstawowa jednostka realizacyjna przypisywana użytkownikom. Zadania mogą być tworzone ręcznie lub generowane automatycznie na podstawie definicji finansowań.

- **Finansowanie**  
  Formalne źródło wymagań oraz ograniczeń projektowych. Finansowania wpływają na strukturę projektu i mogą definiować szablony zadań.

Model domenowy został zaprojektowany w sposób umożliwiający dalszą rozbudowę systemu.

---

## Kluczowe funkcjonalności

- zarządzanie cyklem życia projektów
- zarządzanie zadaniami i podzadaniami
- automatyczne generowanie zadań na podstawie finansowań
- różne sposoby prezentacji danych:
  - widoki list
  - tablica Kanban
  - oś czasu / harmonogram
- zarządzanie zespołem projektowym i odpowiedzialnościami
- filtrowanie, sortowanie oraz paginacja danych
- monitorowanie postępu i ryzyk projektowych
- mechanizmy uwierzytelniania i kontroli dostępu

---

## Architektura

Aplikacja została zaprojektowana w oparciu o **architekturę warstwową**, zapewniającą rozdzielenie odpowiedzialności oraz łatwość utrzymania:

- **Frontend**  
  Aplikacja typu Single Page Application (SPA), odpowiedzialna za interakcję z użytkownikiem i prezentację danych.

- **Backend**  
  Warstwa API realizująca logikę biznesową, walidację oraz reguły domenowe.

- **Baza danych**  
  Relacyjna baza danych zapewniająca integralność oraz spójność danych.

Architektura umożliwia skalowanie systemu oraz jego dalszy rozwój.

---

## Stos technologiczny

### Frontend
- **JavaScript / TypeScript** — logika kliencka z silnym typowaniem
- **React** — architektura komponentowa interfejsu użytkownika
- **SPA (Single Page Application)** — renderowanie sterowane stanem aplikacji
- **Warstwa komunikacji HTTP** — typowana komunikacja z API backendowym

### Backend
- **Python** — główny język warstwy serwerowej
- **Django** — podstawowy framework backendowy
- **Django REST Framework (DRF)** — implementacja REST API
- **Modularna struktura aplikacji** — separacja domen i odpowiedzialności
- **Uwierzytelnianie i autoryzacja** — kontrola dostępu oraz role użytkowników

### Baza danych
- **PostgreSQL** — relacyjny silnik bazodanowy
- **Jawny schemat relacyjny** — integralność danych i więzy logiczne
- **Transakcyjność (ACID)** — spójność operacji

### Narzędzia i jakość
- **Git** — system kontroli wersji
- **Testy automatyczne** — testy jednostkowe, integracyjne i end-to-end
- **Konfiguracja środowiskowa** — separacja środowisk deweloperskich i produkcyjnych

---

## Dokumentacja

Projekt powstał jako **praca dyplomowa inżynierska**, obejmująca:

- analizę istniejących narzędzi do zarządzania projektami (Asana, Jira, ClickUp)
- projekt architektury systemu
- model domenowy i bazodanowy
- opis interfejsu użytkownika
- testowanie oraz wnioski końcowe

---
## Instalacja
1. Utwórz plik `.env` w katalogu głównym projektu
2. Wypełnij plik `.env` zgodnie ze schematem
```.env
# Przykładowy plk
#Bezpieczeństwo
SECRET_KEY=klucz
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

#Baza danych Postgres
DB_NAME=name
DB_USER=user
DB_PASSWORD=password
DB_HOST=db
DB_PORT=5432

#Konto admina
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=admin
```
3. Zbuduj w terminalu oraz uruchom `sudo docker compose up --build`

Od tego momentu będzie można dotrzeć do jednej ze stron:

|     Nazwa      |                  Adres strony                   |
|:--------------:|:----------------------------------------------:|
|  Django admin  | [http://localhost:8000](http://localhost:8000) |
| React frontend | [http://localhost:5137](http://localhost:5137) |

Bez zmian w kodzie można uruchamiać obrazy za pomocą `sudo docker compose up`.

Dodatkowy parametr `-d` uruchamia w tle.

## Autor

**Marek Turkowicz 2026**   
---
