# PROMT – projekt schematu relacyjnego

Projekt bazy danych systemu PROMT (Plan–Run–Optimise Management Tool) dla SZBD PostgreSQL 15+.
Schemat obejmuje 22 relacji. Implementacja: `promt-schemat.sql` (przetestowana na PostgreSQL 18), diagram: `promt-schemat.drawio`.

## 1. Konwencje

- Zapis relacji: **NAZWA**(<u>klucz główny</u>, #klucz obcy, atrybut).
- Klucz główny każdej relacji (poza tabelami łączącymi) to sztuczny identyfikator `id bigint` (`GENERATED ALWAYS AS IDENTITY`).
- `NULL = tak` oznacza atrybut opcjonalny.
- „XOR” – dokładnie jeden z kilku atrybutów jest wypełniony; wymusza to `CHECK (num_nonnulls(...) = 1)`.
- Nazwy relacji i atrybutów w języku angielskim, liczba pojedyncza, `snake_case`.

## 2. Lista relacji

**Firma, ludzie i uprawnienia**

- **USER**(<u>id</u>, email, password, first_name, last_name, is_active, is_staff, is_superuser, last_login, date_joined)
- **ORGANIZATION**(<u>id</u>, name, tax_id, is_active, settings, created_at)
- **ORGANIZATION_MEMBER**(<u>id</u>, #organization_id, #user_id, email, phone, job_title, avatar_url, status, joined_at)
- **MEMBER_GROUP**(<u>id</u>, #organization_id, #project_id, #parent_id, name, description, created_at)
- **MEMBER_GROUP_MEMBER**(<u>#group_id</u>, <u>#member_id</u>, added_at)
- **ROLE**(<u>id</u>, #organization_id, name, scope, permissions)
- **ROLE_ASSIGNMENT**(<u>id</u>, #role_id, #member_id, #group_id, #project_id, created_at)

**Statusy zadań**

- **TASK_STATUS**(<u>id</u>, #organization_id, #project_id, category, name, color, position, is_default, is_active)

**Projekty i finansowanie**

- **PROJECT**(<u>id</u>, #organization_id, #owner_id, name, description, status, start_date, end_date, hidden_status_ids, created_at, updated_at)
- **MILESTONE**(<u>id</u>, #project_id, name, status, due_date, position)
- **FUNDING**(<u>id</u>, #organization_id, type, name, funder, program, agreement_number, amount_total, currency, start_date, end_date, reporting_deadline, description, created_at)
- **PROJECT_FUNDING**(<u>id</u>, #project_id, #funding_id, allocation_start, allocation_end, is_primary, note, created_at)
- **TASK_TEMPLATE**(<u>id</u>, #funding_id, title, description, #default_status_id, default_priority, default_est_hours, default_due_days, mandatory)

**Zadania**

- **TASK**(<u>id</u>, #project_id, #funding_id, #project_funding_id, #milestone_id, #parent_id, #template_id, #status_id, #group_id, title, description, priority, start_date, due_date, est_hours, created_at, updated_at)
- **TASK_ASSIGNMENT**(<u>id</u>, #task_id, #member_id, #assigned_by_id, assigned_at, started_at, finished_at)
- **TIME_ENTRY**(<u>id</u>, #assignment_id, work_date, hours, started_at, finished_at, note, created_at, updated_at)
- **CHECKLIST_ITEM**(<u>id</u>, #task_id, section, title, position, #assignee_id, #done_by_id, done_at)

**Współpraca, koszty i historia**

- **COMMENT**(<u>id</u>, #task_id, #project_id, #author_id, #parent_id, content, created_at, updated_at)
- **ATTACHMENT**(<u>id</u>, #task_id, #comment_id, #expense_id, #uploaded_by_id, file, original_name, mime_type, size_bytes, created_at)
- **EXPENSE**(<u>id</u>, #project_id, #project_funding_id, #task_id, type, amount, currency, spent_on, document_number, description, #created_by_id, created_at)
- **ACTIVITY_LOG**(<u>id</u>, #organization_id, #actor_id, entity_type, entity_id, action, changes, created_at)
- **NOTIFICATION**(<u>id</u>, #activity_id, #recipient_id, content, read_at)

## 3. Związki między relacjami

| Relacja nadrzędna | Relacja podrzędna | Atrybut | Liczebność | Udział podrzędnej | ON DELETE |
|---|---|---|---|---|---|
| organization | organization_member | organization_id | 1 : N | obowiązkowy (1) | CASCADE |
| user | organization_member | user_id | 1 : N | obowiązkowy (1) | CASCADE |
| organization | member_group | organization_id | 1 : N | opcjonalny (0..1) | CASCADE |
| project | member_group | project_id | 1 : N | opcjonalny (0..1) | CASCADE |
| member_group | member_group | parent_id | 1 : N | opcjonalny (0..1) | CASCADE |
| member_group | member_group_member | group_id | 1 : N | obowiązkowy (1) | CASCADE |
| organization_member | member_group_member | member_id | 1 : N | obowiązkowy (1) | CASCADE |
| organization | role | organization_id | 1 : N | opcjonalny (0..1) | CASCADE |
| role | role_assignment | role_id | 1 : N | obowiązkowy (1) | CASCADE |
| organization_member | role_assignment | member_id | 1 : N | opcjonalny (0..1) | CASCADE |
| member_group | role_assignment | group_id | 1 : N | opcjonalny (0..1) | CASCADE |
| project | role_assignment | project_id | 1 : N | opcjonalny (0..1) | CASCADE |
| organization | task_status | organization_id | 1 : N | opcjonalny (0..1) | CASCADE |
| project | task_status | project_id | 1 : N | opcjonalny (0..1) | CASCADE |
| organization | project | organization_id | 1 : N | obowiązkowy (1) | CASCADE |
| organization_member | project | owner_id | 1 : N | obowiązkowy (1) | SET NULL |
| project | milestone | project_id | 1 : N | obowiązkowy (1) | CASCADE |
| organization | funding | organization_id | 1 : N | obowiązkowy (1) | CASCADE |
| project | project_funding | project_id | 1 : N | obowiązkowy (1) | CASCADE |
| funding | project_funding | funding_id | 1 : N | obowiązkowy (1) | CASCADE |
| funding | task_template | funding_id | 1 : N | obowiązkowy (1) | CASCADE |
| task_status | task_template | default_status_id | 1 : N | opcjonalny (0..1) | SET NULL |
| project | task | project_id | 1 : N | opcjonalny (0..1) | CASCADE |
| funding | task | funding_id | 1 : N | opcjonalny (0..1) | CASCADE |
| project_funding | task | project_funding_id | 1 : N | opcjonalny (0..1) | CASCADE |
| milestone | task | milestone_id | 1 : N | opcjonalny (0..1) | SET NULL |
| task | task | parent_id | 1 : N | opcjonalny (0..1) | CASCADE |
| task_template | task | template_id | 1 : N | opcjonalny (0..1) | SET NULL |
| task_status | task | status_id | 1 : N | obowiązkowy (1) | RESTRICT |
| member_group | task | group_id | 1 : N | opcjonalny (0..1) | SET NULL |
| task | task_assignment | task_id | 1 : N | obowiązkowy (1) | CASCADE |
| organization_member | task_assignment | member_id | 1 : N | obowiązkowy (1) | CASCADE |
| organization_member | task_assignment | assigned_by_id | 1 : N | opcjonalny (0..1) | SET NULL |
| task_assignment | time_entry | assignment_id | 1 : N | obowiązkowy (1) | CASCADE |
| task | checklist_item | task_id | 1 : N | obowiązkowy (1) | CASCADE |
| organization_member | checklist_item | assignee_id | 1 : N | opcjonalny (0..1) | SET NULL |
| organization_member | checklist_item | done_by_id | 1 : N | opcjonalny (0..1) | SET NULL |
| task | comment | task_id | 1 : N | opcjonalny (0..1) | CASCADE |
| project | comment | project_id | 1 : N | opcjonalny (0..1) | CASCADE |
| organization_member | comment | author_id | 1 : N | obowiązkowy (1) | RESTRICT |
| comment | comment | parent_id | 1 : N | opcjonalny (0..1) | CASCADE |
| task | attachment | task_id | 1 : N | opcjonalny (0..1) | CASCADE |
| comment | attachment | comment_id | 1 : N | opcjonalny (0..1) | CASCADE |
| expense | attachment | expense_id | 1 : N | opcjonalny (0..1) | CASCADE |
| organization_member | attachment | uploaded_by_id | 1 : N | obowiązkowy (1) | RESTRICT |
| project | expense | project_id | 1 : N | opcjonalny (0..1) | CASCADE |
| project_funding | expense | project_funding_id | 1 : N | opcjonalny (0..1) | CASCADE |
| task | expense | task_id | 1 : N | opcjonalny (0..1) | SET NULL |
| organization_member | expense | created_by_id | 1 : N | obowiązkowy (1) | RESTRICT |
| organization | activity_log | organization_id | 1 : N | obowiązkowy (1) | CASCADE |
| organization_member | activity_log | actor_id | 1 : N | opcjonalny (0..1) | SET NULL |
| activity_log | notification | activity_id | 1 : N | obowiązkowy (1) | CASCADE |
| organization_member | notification | recipient_id | 1 : N | obowiązkowy (1) | CASCADE |

## 4. Normalizacja

| Postać | Warunek | Spełnienie |
|---|---|---|
| 1NF | wartości atomowe, brak grup powtarzających się | tak; wyjątki to typy złożone PostgreSQL (`role.permissions`, `project.hidden_status_ids` – tablice; `settings`, `changes` – jsonb) użyte świadomie jako elementy obiektowo-relacyjne |
| 2NF | brak zależności częściowych od klucza | tak; jedyny klucz złożony (`member_group_member`) ma jeden atrybut niekluczowy zależny od całej pary |
| 3NF | brak zależności przechodnich | tak, poza `task.project_funding_id → task.project_id` (kontrolowana kopia, złożony FK) |
| BCNF | każdy wyznacznik jest kluczem kandydującym | tak dla wszystkich relacji poza `task` |

Zamiast kopiowania danych zastosowano atrybuty XOR (np. grupa firmowa ALBO projektowa, wydatek własny ALBO z finansowania) – każda informacja jest zapisana w jednym miejscu.

## 5. Więzy integralności

- **Encji:** każda relacja ma klucz główny; tabele łączące mają klucz złożony.
- **Referencyjne:** wszystkie powiązania to klucze obce z określoną akcją `ON DELETE` (sekcja 3). `CASCADE` – część nie istnieje bez całości; `SET NULL` – powiązanie opcjonalne; `RESTRICT` – nie wolno usunąć rekordu, do którego odwołuje się historia (np. autor komentarza).
- **Dziedzinowe:** typy, `NOT NULL`, `CHECK` (kategorie statusów, priorytet 1–5, kwoty > 0, daty końca ≥ początku, XOR).
- **Wyjątek świadomy:** `activity_log.entity_type + entity_id` nie ma klucza obcego – wpis historii musi przetrwać usunięcie opisywanego obiektu.
- **Reguły biznesowe w aplikacji** (wymagają danych z kilku relacji): status zadania należy do firmy lub projektu zadania; osoba przypisana jest członkiem firmy projektu; etap i zadanie nadrzędne pochodzą z tego samego projektu; hierarchia grup bez cykli.

## 6. Obiekty dodatkowe

- **Widok zmaterializowany `member_permission`** – efektywne uprawnienia osoby (role własne + role grup i grup nadrzędnych, zapytanie rekurencyjne). Odświeżany po zmianie ról lub grup (`REFRESH MATERIALIZED VIEW CONCURRENTLY`).
- **Trigger `project_funding_create_tasks`** – po podpięciu finansowania do projektu tworzy zadania z szablonów (`task_template`) z terminem = początek alokacji + `default_due_days`.

## 7. Opis relacji

## Firma, ludzie i uprawnienia

### 1. user

Własny model użytkownika Django (AbstractUser) – logowanie e-mailem. Jedno konto na osobę, niezależnie od liczby firm; dane firmowe są w organization_member.

**USER**(<u>id</u>, email, password, first_name, last_name, is_active, is_staff, is_superuser, last_login, date_joined)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| email | `varchar` | tekst o ograniczonej długości | nie | UK | login |
| password | `varchar` | tekst o ograniczonej długości | nie |  |  |
| first_name | `varchar` | tekst o ograniczonej długości | nie |  |  |
| last_name | `varchar` | tekst o ograniczonej długości | nie |  |  |
| is_active | `bool` | wartość logiczna | nie |  |  |
| is_staff | `bool` | wartość logiczna | nie |  |  |
| is_superuser | `bool` | wartość logiczna | nie |  | Admin systemu |
| last_login | `timestamptz` | data i czas ze strefą | tak |  |  |
| date_joined | `timestamptz` | data i czas ze strefą | nie |  |  |

**Więzy**

- `UNIQUE (email)`

**Zależności funkcyjne**

- {id} → {email, password, first_name, last_name, is_active, is_staff, is_superuser, last_login, date_joined}
- {email} → {id}  (klucz kandydujący)

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

### 2. organization

Firma – wszystko poza kontem użytkownika należy do jakiejś firmy.

**ORGANIZATION**(<u>id</u>, name, tax_id, is_active, settings, created_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| name | `varchar` | tekst o ograniczonej długości | nie |  |  |
| tax_id | `varchar` | tekst o ograniczonej długości | tak | UK | NIP |
| is_active | `bool` | wartość logiczna | nie |  | false = zablokowana |
| settings | `jsonb` | dokument JSON (binarny) | nie |  | np. nazwy priorytetów |
| created_at | `timestamptz` | data i czas ze strefą | nie |  |  |

**Więzy**

- `UNIQUE (tax_id) WHERE tax_id IS NOT NULL`

**Zależności funkcyjne**

- {id} → {name, tax_id, is_active, settings, created_at}

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące). Kolumny settings to typy złożone PostgreSQL (tablica / jsonb) – świadome elementy obiektowo-relacyjne; w wariancie czysto relacyjnym byłyby osobną relacją.

**Indeksy**

- `CREATE UNIQUE INDEX organization_tax_id_uq ON organization (tax_id) WHERE tax_id IS NOT NULL`

### 3. organization_member

Osoba w firmie (zastępuje user_profile). Ta sama osoba w dwóch firmach ma dwa wiersze – z innym e-mailem, telefonem, stanowiskiem i avatarem.

**ORGANIZATION_MEMBER**(<u>id</u>, #organization_id, #user_id, email, phone, job_title, avatar_url, status, joined_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| organization_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → organization |  |
| user_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → user |  |
| email | `varchar` | tekst o ograniczonej długości | tak |  | służbowy |
| phone | `varchar` | tekst o ograniczonej długości | tak |  |  |
| job_title | `varchar` | tekst o ograniczonej długości | tak |  |  |
| avatar_url | `varchar` | tekst o ograniczonej długości | tak |  |  |
| status | `varchar` | tekst o ograniczonej długości | nie |  | invited / active / suspended / left |
| joined_at | `timestamptz` | data i czas ze strefą | tak |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| organization_id | organization(id) | CASCADE |
| user_id | user(id) | CASCADE |

**Więzy**

- `UNIQUE (organization_id, user_id)`
- `CHECK (status IN ('invited', 'active', 'suspended', 'left'))`

**Zależności funkcyjne**

- {id} → {organization_id, user_id, email, phone, job_title, avatar_url, status, joined_at}
- {organization_id, user_id} → {id}  (klucz kandydujący)

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

**Indeksy**

- `CREATE INDEX organization_member_user_ix ON organization_member (user_id)`

### 4. member_group

Grupa ludzi: firmowa (Księgowość, Deweloperzy) ALBO projektowa (Frontend w projekcie X). Grupy tworzą drzewo – podgrupa dziedziczy role grupy nadrzędnej.

**MEMBER_GROUP**(<u>id</u>, #organization_id, #project_id, #parent_id, name, description, created_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| organization_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → organization | grupa firmowa ALBO |
| project_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → project | grupa projektowa (XOR) |
| parent_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → member_group | grupa nadrzędna |
| name | `varchar` | tekst o ograniczonej długości | nie |  | Księgowość, Frontend… |
| description | `text` | tekst bez limitu | tak |  | np. „Dział księgowości” |
| created_at | `timestamptz` | data i czas ze strefą | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| organization_id | organization(id) | CASCADE |
| project_id | project(id) | CASCADE |
| parent_id | member_group(id) | CASCADE |

**Więzy**

- `UNIQUE (organization_id, name)`
- `UNIQUE (project_id, name)`
- `CHECK (num_nonnulls(organization_id, project_id) = 1)`

**Zależności funkcyjne**

- {id} → {organization_id, project_id, parent_id, name, description, created_at}
- {organization_id, name} → {id}  (klucz kandydujący)
- {project_id, name} → {id}  (klucz kandydujący)

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

**Indeksy**

- `CREATE INDEX member_group_parent_ix ON member_group (parent_id)`

### 5. member_group_member

Kto należy do grupy (M:N).

**MEMBER_GROUP_MEMBER**(<u>#group_id</u>, <u>#member_id</u>, added_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| group_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK, FK → member_group |  |
| member_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK, FK → organization_member |  |
| added_at | `timestamptz` | data i czas ze strefą | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| group_id | member_group(id) | CASCADE |
| member_id | organization_member(id) | CASCADE |

**Zależności funkcyjne**

- {group_id, member_id} → {added_at}

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

**Indeksy**

- `CREATE INDEX member_group_member_member_ix ON member_group_member (member_id)`

### 6. role

Rola = nazwany zestaw uprawnień (Księgowa, Młodsza księgowa, Admin projektu…). Jedna definicja używana w wielu miejscach. Wbudowane (organization_id = null) + własne firmy.

**ROLE**(<u>id</u>, #organization_id, name, scope, permissions)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| organization_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → organization | null = wbudowana |
| name | `varchar` | tekst o ograniczonej długości | nie |  |  |
| scope | `varchar` | tekst o ograniczonej długości | nie |  | organization / project |
| permissions | `varchar[]` | tablica tekstów | nie |  | ['expense.create', …] |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| organization_id | organization(id) | CASCADE |

**Więzy**

- `UNIQUE NULLS NOT DISTINCT (organization_id, name)`
- `scope: CHECK (scope IN ('organization', 'project'))`

**Zależności funkcyjne**

- {id} → {organization_id, name, scope, permissions}

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące). Kolumny permissions to typy złożone PostgreSQL (tablica / jsonb) – świadome elementy obiektowo-relacyjne; w wariancie czysto relacyjnym byłyby osobną relacją.

**Indeksy**

- `CREATE INDEX role_permissions_gin ON role USING gin (permissions)`

### 7. role_assignment

Nadanie roli osobie ALBO grupie, w całej firmie (project_id = null – obowiązuje we wszystkich projektach) albo w jednym projekcie. Uprawnienia osoby = role własne + role jej grup i grup nadrzędnych, z poziomu firmy i projektu.

**ROLE_ASSIGNMENT**(<u>id</u>, #role_id, #member_id, #group_id, #project_id, created_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| role_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → role |  |
| member_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → organization_member | osoba ALBO |
| group_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → member_group | grupa (XOR) |
| project_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → project | null = cała firma |
| created_at | `timestamptz` | data i czas ze strefą | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| role_id | role(id) | CASCADE |
| member_id | organization_member(id) | CASCADE |
| group_id | member_group(id) | CASCADE |
| project_id | project(id) | CASCADE |

**Więzy**

- `UNIQUE NULLS NOT DISTINCT (role_id, member_id, group_id, project_id)`
- `CHECK (num_nonnulls(member_id, group_id) = 1)`

**Zależności funkcyjne**

- {id} → {role_id, member_id, group_id, project_id, created_at}

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

**Indeksy**

- `CREATE INDEX role_assignment_member_ix ON role_assignment (member_id)`
- `CREATE INDEX role_assignment_group_ix ON role_assignment (group_id)`
- `CREATE INDEX role_assignment_project_ix ON role_assignment (project_id)`

## Statusy zadań

### 8. task_status

Statusy zadań firmy albo projektu. category = jedna z 4 stałych wartości (todo / in_progress / done / cancelled), na której opiera się logika i kolumny Kanbana. Wiersze to statusy firmy w kategorii.

**TASK_STATUS**(<u>id</u>, #organization_id, #project_id, category, name, color, position, is_default, is_active)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| organization_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → organization | status firmy ALBO |
| project_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → project | status projektu (XOR) |
| category | `varchar` | tekst o ograniczonej długości | nie |  | todo / in_progress / done / cancelled |
| name | `varchar` | tekst o ograniczonej długości | nie |  | In Development, Testing… |
| color | `varchar` | tekst o ograniczonej długości | nie |  |  |
| position | `smallint` | liczba całkowita 16-bit | nie |  |  |
| is_default | `bool` | wartość logiczna | nie |  |  |
| is_active | `bool` | wartość logiczna | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| organization_id | organization(id) | CASCADE |
| project_id | project(id) | CASCADE |

**Więzy**

- `UNIQUE (organization_id, name)`
- `UNIQUE (project_id, name)`
- `CHECK (category IN ('todo', 'in_progress', 'done', 'cancelled'))`
- `CHECK (num_nonnulls(organization_id, project_id) = 1)`

**Zależności funkcyjne**

- {id} → {organization_id, project_id, category, name, color, position, is_default, is_active}
- {organization_id, name} → {id}  (klucz kandydujący)
- {project_id, name} → {id}  (klucz kandydujący)

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

## Projekty i finansowanie

### 9. project

Projekt – z bazy, dostaje firmę. Może dodać własne statusy (task_status.project_id) i wyłączyć statusy firmy.

**PROJECT**(<u>id</u>, #organization_id, #owner_id, name, description, status, start_date, end_date, hidden_status_ids, created_at, updated_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| organization_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → organization |  |
| owner_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → organization_member | z bazy |
| name | `varchar` | tekst o ograniczonej długości | nie |  |  |
| description | `text` | tekst bez limitu | nie |  |  |
| status | `varchar` | tekst o ograniczonej długości | nie |  | z bazy |
| start_date | `date` | data | tak |  |  |
| end_date | `date` | data | tak |  |  |
| hidden_status_ids | `bigint[]` | tablica identyfikatorów | nie |  | wyłączone statusy firmy |
| created_at | `timestamptz` | data i czas ze strefą | nie |  |  |
| updated_at | `timestamptz` | data i czas ze strefą | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| organization_id | organization(id) | CASCADE |
| owner_id | organization_member(id) | SET NULL |

**Więzy**

- `CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)`

**Zależności funkcyjne**

- {id} → {organization_id, owner_id, name, description, status, start_date, end_date, hidden_status_ids, created_at, updated_at}

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące). Kolumny hidden_status_ids to typy złożone PostgreSQL (tablica / jsonb) – świadome elementy obiektowo-relacyjne; w wariancie czysto relacyjnym byłyby osobną relacją.

**Indeksy**

- `CREATE INDEX project_organization_ix ON project (organization_id)`
- `CREATE INDEX project_owner_ix ON project (owner_id)`

### 10. milestone

Etap projektu z terminem.

**MILESTONE**(<u>id</u>, #project_id, name, status, due_date, position)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| project_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → project |  |
| name | `varchar` | tekst o ograniczonej długości | nie |  |  |
| status | `varchar` | tekst o ograniczonej długości | nie |  | planned / active / done |
| due_date | `date` | data | tak |  |  |
| position | `smallint` | liczba całkowita 16-bit | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| project_id | project(id) | CASCADE |

**Więzy**

- `status: CHECK (status IN ('planned', 'active', 'done'))`

**Zależności funkcyjne**

- {id} → {project_id, name, status, due_date, position}

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

**Indeksy**

- `CREATE INDEX milestone_project_ix ON milestone (project_id, position)`

### 11. funding

Finansowanie – z bazy, dostaje firmę (grant należy do firmy i finansuje kilka jej projektów).

**FUNDING**(<u>id</u>, #organization_id, type, name, funder, program, agreement_number, amount_total, currency, start_date, end_date, reporting_deadline, description, created_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| organization_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → organization |  |
| type | `varchar` | tekst o ograniczonej długości | nie |  |  |
| name | `varchar` | tekst o ograniczonej długości | nie |  |  |
| funder | `varchar` | tekst o ograniczonej długości | nie |  |  |
| program | `varchar` | tekst o ograniczonej długości | nie |  |  |
| agreement_number | `varchar` | tekst o ograniczonej długości | nie |  |  |
| amount_total | `numeric(14,2)` | kwota (14 cyfr, 2 po przecinku) | nie |  |  |
| currency | `char(3)` | kod waluty ISO 4217 | nie |  |  |
| start_date | `date` | data | tak |  |  |
| end_date | `date` | data | tak |  |  |
| reporting_deadline | `date` | data | tak |  |  |
| description | `text` | tekst bez limitu | nie |  |  |
| created_at | `timestamptz` | data i czas ze strefą | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| organization_id | organization(id) | CASCADE |

**Zależności funkcyjne**

- {id} → {organization_id, type, name, funder, program, agreement_number, amount_total, currency, start_date, end_date, reporting_deadline, description, created_at}

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

**Indeksy**

- `CREATE INDEX funding_organization_ix ON funding (organization_id)`

### 12. project_funding

Z bazy, bez zmian: które finansowanie finansuje który projekt i w jakim okresie.

**PROJECT_FUNDING**(<u>id</u>, #project_id, #funding_id, allocation_start, allocation_end, is_primary, note, created_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| project_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → project |  |
| funding_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → funding |  |
| allocation_start | `date` | data | tak |  |  |
| allocation_end | `date` | data | tak |  |  |
| is_primary | `bool` | wartość logiczna | nie |  |  |
| note | `text` | tekst bez limitu | nie |  |  |
| created_at | `timestamptz` | data i czas ze strefą | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| project_id | project(id) | CASCADE |
| funding_id | funding(id) | CASCADE |

**Więzy**

- `UNIQUE (project_id, funding_id)`
- `UNIQUE (id, project_id)                                  -- cel złożonego FK z task`

**Zależności funkcyjne**

- {id} → {project_id, funding_id, allocation_start, allocation_end, is_primary, note, created_at}
- {project_id, funding_id} → {id}  (klucz kandydujący)
- {id, project_id} → {id}  (klucz kandydujący)

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

**Indeksy**

- `CREATE INDEX project_funding_funding_ix ON project_funding (funding_id)`

### 13. task_template

Szablon zadania (w bazie: funding_task) – zadanie wymagane przez finansowanie. Po podpięciu finansowania do projektu (INSERT project_funding) zadania z szablonów tworzą się automatycznie (task z project_funding_id i template_id).

**TASK_TEMPLATE**(<u>id</u>, #funding_id, title, description, #default_status_id, default_priority, default_est_hours, default_due_days, mandatory)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| funding_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → funding |  |
| title | `varchar` | tekst o ograniczonej długości | nie |  |  |
| description | `text` | tekst bez limitu | nie |  |  |
| default_status_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → task_status |  |
| default_priority | `smallint` | liczba całkowita 16-bit | nie |  | 1..5 |
| default_est_hours | `numeric(6,2)` | liczba godzin | tak |  |  |
| default_due_days | `int` | liczba całkowita | tak |  |  |
| mandatory | `bool` | wartość logiczna | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| funding_id | funding(id) | CASCADE |
| default_status_id | task_status(id) | SET NULL |

**Więzy**

- `default_priority: CHECK (default_priority BETWEEN 1 AND 5)`

**Zależności funkcyjne**

- {id} → {funding_id, title, description, default_status_id, default_priority, default_est_hours, default_due_days, mandatory}

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

**Indeksy**

- `CREATE INDEX task_template_funding_ix ON task_template (funding_id)`
- `CREATE INDEX task_template_status_ix ON task_template (default_status_id)`

## Zadania

### 14. task

Zadanie – z bazy. Kontekst z dawnego task_scope jest w kolumnach zadania (ta sama informacja, bez JOIN-a): projekt ALBO samo finansowanie, opcjonalnie finansowanie projektu. Status to etykieta firmy/projektu – jego kategorię (todo / in progress / done / cancelled) zna sam status.

**TASK**(<u>id</u>, #project_id, #funding_id, #project_funding_id, #milestone_id, #parent_id, #template_id, #status_id, #group_id, title, description, priority, start_date, due_date, est_hours, created_at, updated_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| project_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → project | zadanie projektu ALBO |
| funding_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → funding | zadanie samego grantu |
| project_funding_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → project_funding | grant w projekcie |
| milestone_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → milestone |  |
| parent_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → task | podzadanie |
| template_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → task_template | z jakiego szablonu |
| status_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → task_status | etykieta, np. „In Development” |
| group_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → member_group | zadanie dla grupy |
| title | `varchar` | tekst o ograniczonej długości | nie |  |  |
| description | `text` | tekst bez limitu | nie |  |  |
| priority | `smallint` | liczba całkowita 16-bit | nie |  | 1..5 |
| start_date | `date` | data | tak |  |  |
| due_date | `date` | data | tak |  |  |
| est_hours | `numeric(6,2)` | liczba godzin | tak |  |  |
| created_at | `timestamptz` | data i czas ze strefą | nie |  |  |
| updated_at | `timestamptz` | data i czas ze strefą | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| project_id | project(id) | CASCADE |
| funding_id | funding(id) | CASCADE |
| project_funding_id | project_funding(id) | CASCADE |
| milestone_id | milestone(id) | SET NULL |
| parent_id | task(id) | CASCADE |
| template_id | task_template(id) | SET NULL |
| status_id | task_status(id) | RESTRICT |
| group_id | member_group(id) | SET NULL |
| złożony | `FOREIGN KEY (project_funding_id, project_id) REFERENCES project_funding (id, project_id) ON DELETE CASCADE` | |

**Więzy**

- `priority: CHECK (priority BETWEEN 1 AND 5)`
- `CHECK ((project_id IS NULL) <> (funding_id IS NULL))`
- `CHECK (project_funding_id IS NULL OR project_id IS NOT NULL)`

**Zależności funkcyjne**

- {id} → {project_id, funding_id, project_funding_id, milestone_id, parent_id, template_id, status_id, group_id, title, description, priority, start_date, due_date, est_hours, created_at, updated_at}
- {project_funding_id} → {project_id}  (zależność przechodnia – kontrolowana kopia, złożony FK)

**Postać normalna:** 3NF z jedną kontrolowaną zależnością przechodnią: project_funding_id → project_id. Zgodność wymusza złożony klucz obcy (project_funding_id, project_id) → project_funding(id, project_id), więc anomalia aktualizacji nie może wystąpić.

**Indeksy**

- `CREATE INDEX task_project_status_ix ON task (project_id, status_id, priority DESC)`
- `CREATE INDEX task_funding_ix ON task (funding_id)`
- `CREATE INDEX task_project_funding_ix ON task (project_funding_id)`
- `CREATE INDEX task_milestone_ix ON task (milestone_id)`
- `CREATE INDEX task_parent_ix ON task (parent_id)`
- `CREATE INDEX task_template_ix ON task (template_id)`
- `CREATE INDEX task_status_ix ON task (status_id)`
- `CREATE INDEX task_group_ix ON task (group_id)`
- `CREATE INDEX task_due_ix ON task (due_date)`

### 15. task_assignment

Z bazy: kto wykonuje zadanie i kiedy zaczął / skończył. Godziny są w time_entry.

**TASK_ASSIGNMENT**(<u>id</u>, #task_id, #member_id, #assigned_by_id, assigned_at, started_at, finished_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| task_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → task |  |
| member_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → organization_member |  |
| assigned_by_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → organization_member |  |
| assigned_at | `timestamptz` | data i czas ze strefą | nie |  |  |
| started_at | `timestamptz` | data i czas ze strefą | tak |  |  |
| finished_at | `timestamptz` | data i czas ze strefą | tak |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| task_id | task(id) | CASCADE |
| member_id | organization_member(id) | CASCADE |
| assigned_by_id | organization_member(id) | SET NULL |

**Więzy**

- `UNIQUE (task_id, member_id)`
- `CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at)`

**Zależności funkcyjne**

- {id} → {task_id, member_id, assigned_by_id, assigned_at, started_at, finished_at}
- {task_id, member_id} → {id}  (klucz kandydujący)

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

**Indeksy**

- `CREATE INDEX task_assignment_member_ix ON task_assignment (member_id)`
- `CREATE INDEX task_assignment_assigned_by_ix ON task_assignment (assigned_by_id)`

### 16. time_entry

Ewidencja czasu: data, godziny, opcjonalnie dokładny start i koniec. Wpis należy do przypisania osoby do zadania.

**TIME_ENTRY**(<u>id</u>, #assignment_id, work_date, hours, started_at, finished_at, note, created_at, updated_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| assignment_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → task_assignment |  |
| work_date | `date` | data | nie |  |  |
| hours | `numeric(5,2)` | liczba godzin | nie |  |  |
| started_at | `timestamptz` | data i czas ze strefą | tak |  |  |
| finished_at | `timestamptz` | data i czas ze strefą | tak |  |  |
| note | `text` | tekst bez limitu | tak |  |  |
| created_at | `timestamptz` | data i czas ze strefą | nie |  |  |
| updated_at | `timestamptz` | data i czas ze strefą | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| assignment_id | task_assignment(id) | CASCADE |

**Więzy**

- `hours: CHECK (hours > 0)`
- `CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at > started_at)`

**Zależności funkcyjne**

- {id} → {assignment_id, work_date, hours, started_at, finished_at, note, created_at, updated_at}

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

**Indeksy**

- `CREATE INDEX time_entry_assignment_ix ON time_entry (assignment_id, work_date)`

### 17. checklist_item

Punkt checklisty w zadaniu; section grupuje punkty, gdy list jest kilka.

**CHECKLIST_ITEM**(<u>id</u>, #task_id, section, title, position, #assignee_id, #done_by_id, done_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| task_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → task |  |
| section | `varchar` | tekst o ograniczonej długości | tak |  |  |
| title | `varchar` | tekst o ograniczonej długości | nie |  |  |
| position | `smallint` | liczba całkowita 16-bit | nie |  |  |
| assignee_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → organization_member | kto ma odhaczyć |
| done_by_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → organization_member |  |
| done_at | `timestamptz` | data i czas ze strefą | tak |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| task_id | task(id) | CASCADE |
| assignee_id | organization_member(id) | SET NULL |
| done_by_id | organization_member(id) | SET NULL |

**Zależności funkcyjne**

- {id} → {task_id, section, title, position, assignee_id, done_by_id, done_at}

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

**Indeksy**

- `CREATE INDEX checklist_item_task_ix ON checklist_item (task_id, section, position)`
- `CREATE INDEX checklist_item_assignee_ix ON checklist_item (assignee_id)`
- `CREATE INDEX checklist_item_done_by_ix ON checklist_item (done_by_id)`

## Współpraca, koszty i historia

### 18. comment

Komentarz do zadania ALBO projektu (model Kuby, zwykłe FK zamiast relacji generycznej).

**COMMENT**(<u>id</u>, #task_id, #project_id, #author_id, #parent_id, content, created_at, updated_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| task_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → task | zadanie ALBO |
| project_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → project | projekt (XOR) |
| author_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → organization_member |  |
| parent_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → comment | odpowiedź |
| content | `text` | tekst bez limitu | nie |  |  |
| created_at | `timestamptz` | data i czas ze strefą | nie |  |  |
| updated_at | `timestamptz` | data i czas ze strefą | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| task_id | task(id) | CASCADE |
| project_id | project(id) | CASCADE |
| author_id | organization_member(id) | RESTRICT |
| parent_id | comment(id) | CASCADE |

**Więzy**

- `CHECK (num_nonnulls(task_id, project_id) = 1)`

**Zależności funkcyjne**

- {id} → {task_id, project_id, author_id, parent_id, content, created_at, updated_at}

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

**Indeksy**

- `CREATE INDEX comment_task_ix ON comment (task_id, created_at)`
- `CREATE INDEX comment_project_ix ON comment (project_id, created_at)`
- `CREATE INDEX comment_author_ix ON comment (author_id)`
- `CREATE INDEX comment_parent_ix ON comment (parent_id)`

### 19. attachment

Plik zadania, komentarza albo wydatku (faktura) – model Kuby; przejmuje receipt_url z task.

**ATTACHMENT**(<u>id</u>, #task_id, #comment_id, #expense_id, #uploaded_by_id, file, original_name, mime_type, size_bytes, created_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| task_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → task | dokładnie jedno |
| comment_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → comment | z tych |
| expense_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → expense | trzech |
| uploaded_by_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → organization_member |  |
| file | `varchar` | tekst o ograniczonej długości | nie |  |  |
| original_name | `varchar` | tekst o ograniczonej długości | nie |  |  |
| mime_type | `varchar` | tekst o ograniczonej długości | nie |  |  |
| size_bytes | `bigint` | liczba całkowita 64-bit (identyfikator) | nie |  |  |
| created_at | `timestamptz` | data i czas ze strefą | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| task_id | task(id) | CASCADE |
| comment_id | comment(id) | CASCADE |
| expense_id | expense(id) | CASCADE |
| uploaded_by_id | organization_member(id) | RESTRICT |

**Więzy**

- `size_bytes: CHECK (size_bytes >= 0)`
- `CHECK (num_nonnulls(task_id, comment_id, expense_id) = 1)`

**Zależności funkcyjne**

- {id} → {task_id, comment_id, expense_id, uploaded_by_id, file, original_name, mime_type, size_bytes, created_at}

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

**Indeksy**

- `CREATE INDEX attachment_task_ix ON attachment (task_id)`
- `CREATE INDEX attachment_comment_ix ON attachment (comment_id)`
- `CREATE INDEX attachment_expense_ix ON attachment (expense_id)`
- `CREATE INDEX attachment_uploaded_by_ix ON attachment (uploaded_by_id)`

### 20. expense

Wydatek (model Kuby) – przejmuje cost_* z task. Koszt własny projektu ALBO rozliczany z finansowania (project_funding już wskazuje projekt, więc nie powtarzamy project_id).

**EXPENSE**(<u>id</u>, #project_id, #project_funding_id, #task_id, type, amount, currency, spent_on, document_number, description, #created_by_id, created_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| project_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → project | koszt własny ALBO |
| project_funding_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → project_funding | z finansowania (XOR) |
| task_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → task | koszt zadania (jak cost_* w bazie) |
| type | `varchar` | tekst o ograniczonej długości | nie |  |  |
| amount | `numeric(14,2)` | kwota (14 cyfr, 2 po przecinku) | nie |  |  |
| currency | `char(3)` | kod waluty ISO 4217 | nie |  |  |
| spent_on | `date` | data | nie |  |  |
| document_number | `varchar` | tekst o ograniczonej długości | tak |  |  |
| description | `text` | tekst bez limitu | nie |  |  |
| created_by_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → organization_member |  |
| created_at | `timestamptz` | data i czas ze strefą | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| project_id | project(id) | CASCADE |
| project_funding_id | project_funding(id) | CASCADE |
| task_id | task(id) | SET NULL |
| created_by_id | organization_member(id) | RESTRICT |

**Więzy**

- `amount: CHECK (amount > 0)`
- `CHECK (num_nonnulls(project_id, project_funding_id) = 1)`

**Zależności funkcyjne**

- {id} → {project_id, project_funding_id, task_id, type, amount, currency, spent_on, document_number, description, created_by_id, created_at}

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące).

**Indeksy**

- `CREATE INDEX expense_project_ix ON expense (project_id, spent_on)`
- `CREATE INDEX expense_project_funding_ix ON expense (project_funding_id)`
- `CREATE INDEX expense_task_ix ON expense (task_id)`
- `CREATE INDEX expense_created_by_ix ON expense (created_by_id)`

### 21. activity_log

Historia zdarzeń: kto, co, na czym. Każda zmiana zadania (np. nowy status) zapisuje tu wiersz.

**ACTIVITY_LOG**(<u>id</u>, #organization_id, #actor_id, entity_type, entity_id, action, changes, created_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| organization_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → organization |  |
| actor_id | `bigint` | liczba całkowita 64-bit (identyfikator) | tak | FK → organization_member |  |
| entity_type | `varchar` | tekst o ograniczonej długości | nie |  | task / project … |
| entity_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie |  |  |
| action | `varchar` | tekst o ograniczonej długości | nie |  | status_changed … |
| changes | `jsonb` | dokument JSON (binarny) | nie |  |  |
| created_at | `timestamptz` | data i czas ze strefą | nie |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| organization_id | organization(id) | CASCADE |
| actor_id | organization_member(id) | SET NULL |

**Zależności funkcyjne**

- {id} → {organization_id, actor_id, entity_type, entity_id, action, changes, created_at}

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące). Kolumny changes to typy złożone PostgreSQL (tablica / jsonb) – świadome elementy obiektowo-relacyjne; w wariancie czysto relacyjnym byłyby osobną relacją.

**Indeksy**

- `CREATE INDEX activity_log_entity_ix ON activity_log (entity_type, entity_id, created_at)`
- `CREATE INDEX activity_log_org_ix ON activity_log (organization_id, created_at)`
- `CREATE INDEX activity_log_actor_ix ON activity_log (actor_id)`

### 22. notification

Skrzynka osoby: jedno zdarzenie z historii → po jednym wierszu dla każdego odbiorcy (osoby przypisane do zadania albo członkowie grupy zadania). Wiersz na osobę jest potrzebny, bo każdy czyta osobno (read_at). content trzyma gotową treść wiadomości (tytuł, tekst, link), żeby skrzynka nie musiała jej składać z logu.

**NOTIFICATION**(<u>id</u>, #activity_id, #recipient_id, content, read_at)

| Atrybut | Typ | Dziedzina | NULL | Klucz | Opis |
|---|---|---|---|---|---|
| id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | PK |  |
| activity_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → activity_log |  |
| recipient_id | `bigint` | liczba całkowita 64-bit (identyfikator) | nie | FK → organization_member |  |
| content | `jsonb` | dokument JSON (binarny) | nie |  | treść: tytuł, tekst, link |
| read_at | `timestamptz` | data i czas ze strefą | tak |  |  |

**Klucze obce**

| Atrybut | Odwołuje się do | ON DELETE |
|---|---|---|
| activity_id | activity_log(id) | CASCADE |
| recipient_id | organization_member(id) | CASCADE |

**Więzy**

- `UNIQUE (activity_id, recipient_id)`

**Zależności funkcyjne**

- {id} → {activity_id, recipient_id, content, read_at}
- {activity_id, recipient_id} → {id}  (klucz kandydujący)

**Postać normalna:** BCNF – jedynym wyznacznikiem są klucze (kandydujące). Kolumny content to typy złożone PostgreSQL (tablica / jsonb) – świadome elementy obiektowo-relacyjne; w wariancie czysto relacyjnym byłyby osobną relacją.

**Indeksy**

- `CREATE INDEX notification_unread_ix ON notification (recipient_id) WHERE read_at IS NULL`
