# PROMT – schemat bazy v2 (propozycja)

26 własnych tabel + `django_content_type`. Podgląd w VS Code: `Ctrl+Shift+V`.

## Co się zmienia względem wersji 25 tabel

| Zmiana | Dlaczego |
|---|---|
| `auth_user` + `user_profile` → jeden `user` (własny model, tylko dane globalne: login, hasło, imię, nazwisko) | dane „w firmie” są różne w każdej organizacji |
| `organization_member` dostaje dane osoby w danej firmie: e-mail służbowy, telefon, stanowisko, nazwa wyświetlana, status | ta sama osoba w dwóch firmach = dwa różne „profile” |
| przypisania, zespoły, role, checklisty, powiadomienia wskazują na **`organization_member`**, nie na `user` | osoba działa zawsze w kontekście firmy |
| `organization.contact_email` → tabela **`organization_contact`** (osoba + rodzaj: główny / rozliczenia / techniczny) | kontaktem jest konkretna osoba z firmy, nie luźny adres |
| `status` = **podstatus**, pole `category` = status główny: `todo / in_progress / done / cancelled` | firmy i projekty dodają własne podstatusy, logika systemu opiera się na 4 kategoriach |
| statusy są per organizacja (kopiowane przy zakładaniu firmy), opcjonalnie per projekt | każda firma może zmienić nazwy, projekt może dodać swoje |
| `task.status_category` – kopia kategorii pilnowana **złożonym FK** | filtrowanie po kategorii bez JOIN-a, baza sama pilnuje zgodności |
| `priority` = liczba 1–5 (CHECK), nazwy w **`priority_level`** (opcjonalnie per firma) | sortowanie/filtr bez JOIN-a, a firma może nazwać poziomy po swojemu |
| `task_scope` (1:1) wchłonięte do `task` (`project_id`, `project_funding_id`) | jeden JOIN mniej w każdym zapytaniu o zadania |
| koszty z `task` → `expense` (twarde FK) | wydatek to osobny fakt, zadanie może mieć ich kilka |
| `comment` / `attachment` z osobnymi kolumnami FK + CHECK „dokładnie jedno” zamiast relacji generycznej | prawdziwe klucze obce i indeksy |

## 1. Przegląd – wszystkie połączenia

```mermaid
erDiagram
    user ||--o{ organization_member : "jest członkiem"
    organization ||--o{ organization_member : "ma członków"
    organization_member ||--o{ organization_contact : "kontakt"
    organization ||--o{ team : "grupy"
    team ||--o{ team_member : ""
    organization_member ||--o{ team_member : ""
    role ||--o{ role_permission : ""
    permission ||--o{ role_permission : ""
    role ||--o{ role_assignment : ""
    organization_member |o--o{ role_assignment : "osoba"
    team |o--o{ role_assignment : "albo grupa"
    project |o--o{ role_assignment : "zakres: projekt"
    organization ||--o{ role_assignment : "zakres: firma"

    organization ||--o{ status : "podstatusy"
    organization ||--o{ priority_level : "nazwy priorytetów"
    organization ||--o{ project : ""
    organization ||--o{ funding : ""
    project ||--o{ milestone : ""
    project ||--o{ project_funding : ""
    funding ||--o{ project_funding : ""
    funding ||--o{ funding_task : "szablony"
    project ||--o{ task : ""
    project_funding |o--o{ task : "z grantu"
    milestone |o--o{ task : ""
    status ||--o{ task : "podstatus + kategoria"
    priority_level |o..o{ task : "poziom 1-5 (bez FK)"
    task ||--o{ task_assignment : ""
    organization_member ||--o{ task_assignment : "wykonawca"
    task ||--o{ checklist : ""
    checklist ||--o{ checklist_item : ""

    task |o--o{ comment : ""
    project |o--o{ comment : ""
    task |o--o{ attachment : ""
    expense |o--o{ attachment : "faktura"
    project ||--o{ expense : ""
    project_funding |o--o{ expense : "rozliczane z"
    organization ||--o{ activity_log : ""
    activity_log ||--o{ notification : ""
    organization_member ||--o{ notification : "odbiorca"
```

## 2. Tożsamość, organizacja i uprawnienia

```mermaid
erDiagram
    user ||--o{ organization_member : "user"
    user |o--o{ organization : "created_by"
    organization ||--o{ organization_member : "organization"
    organization_member |o--o{ organization_member : "invited_by"
    organization_member ||--o{ organization_contact : "member"
    organization |o--o{ role : "organization (null = wbudowana)"
    role ||--o{ role_permission : "role"
    permission ||--o{ role_permission : "permission"
    organization ||--o{ team : "organization"
    project |o--o{ team : "project"
    team |o--o{ team : "parent"
    team ||--o{ team_member : "team"
    organization_member ||--o{ team_member : "member"
    role ||--o{ role_assignment : "role"
    organization_member |o--o{ role_assignment : "member"
    team |o--o{ role_assignment : "team"
    organization ||--o{ role_assignment : "organization"
    project |o--o{ role_assignment : "project"
    organization_member |o--o{ role_assignment : "granted_by"

    user {
        bigint id PK
        varchar email UK "login"
        varchar password
        varchar first_name
        varchar last_name
        bool is_active
        bool is_superuser "admin systemu"
        timestamp last_login
        timestamp date_joined
    }
    organization {
        bigint id PK
        varchar name
        varchar slug UK "nazwa do URL: /org/budimex"
        varchar tax_id UK "NIP, opcjonalny"
        bool is_active
        bigint created_by_id FK
        timestamp created_at
    }
    organization_member {
        bigint id PK
        bigint organization_id FK "UK z user_id"
        bigint user_id FK
        varchar display_name
        varchar email "służbowy w tej firmie"
        varchar phone
        varchar job_title
        varchar avatar_url
        varchar status "invited / active / suspended / left"
        bigint invited_by_id FK
        timestamp joined_at
        timestamp left_at
    }
    organization_contact {
        bigint id PK
        bigint member_id FK
        varchar kind "main / billing / technical"
    }
    permission {
        bigint id PK
        varchar code UK "task.change_status"
        varchar description
        varchar scope "organization / project"
    }
    role {
        bigint id PK
        bigint organization_id FK "null = wbudowana"
        varchar code
        varchar name "Księgowość, Wykonawca..."
        varchar scope "organization / project"
    }
    role_permission {
        bigint role_id PK, FK
        bigint permission_id PK, FK
    }
    team {
        bigint id PK
        bigint organization_id FK
        bigint project_id FK "null = grupa firmowa"
        bigint parent_id FK
        varchar name "Deweloperzy, Testerzy..."
        text description
    }
    team_member {
        bigint team_id PK, FK
        bigint member_id PK, FK
        timestamp added_at
    }
    role_assignment {
        bigint id PK
        bigint role_id FK
        bigint member_id FK "osoba ALBO"
        bigint team_id FK "grupa (XOR)"
        bigint organization_id FK "zawsze"
        bigint project_id FK "null = cała firma"
        bigint granted_by_id FK
        timestamp created_at
    }
```

## 3. Statusy, priorytety, projekty i zadania

```mermaid
erDiagram
    organization ||--o{ status : "organization"
    project |o--o{ status : "project (null = cała firma)"
    organization ||--o{ priority_level : "organization"
    organization ||--o{ project : "organization"
    status ||--o{ project : "status"
    organization_member ||--o{ project : "created_by"
    project ||--o{ milestone : "project"
    status ||--o{ milestone : "status"
    organization ||--o{ funding : "organization"
    project ||--o{ project_funding : "project"
    funding ||--o{ project_funding : "funding"
    funding ||--o{ funding_task : "funding"
    status |o--o{ funding_task : "default_status"
    project ||--o{ task : "project"
    project_funding |o--o{ task : "project_funding"
    milestone |o--o{ task : "milestone"
    task |o--o{ task : "parent"
    funding_task |o--o{ task : "template"
    status ||--o{ task : "status_id + status_category"
    priority_level |o..o{ task : "priority (bez FK)"
    organization_member ||--o{ task : "created_by"
    task ||--o{ task_assignment : "task"
    organization_member ||--o{ task_assignment : "member"
    task ||--o{ checklist : "task"
    checklist ||--o{ checklist_item : "checklist"
    organization_member |o--o{ checklist_item : "assignee / done_by"

    status {
        bigint id PK "UK (id, category)"
        bigint organization_id FK
        bigint project_id FK "null = cała firma"
        varchar applies_to "task / milestone / project"
        varchar category "todo / in_progress / done / cancelled"
        varchar code
        varchar name "In Development, Oddane klientowi..."
        smallint position
        varchar color
        bool is_default "jeden na kategorię"
        bool is_active
    }
    priority_level {
        bigint organization_id PK, FK
        smallint level PK "1..5"
        varchar name "Krytyczny, Wysoki..."
        varchar color
    }
    project {
        bigint id PK
        bigint organization_id FK
        bigint status_id FK
        varchar name
        text description
        date start_date
        date end_date
        bigint created_by_id FK
        timestamp created_at
        timestamp updated_at
    }
    milestone {
        bigint id PK
        bigint project_id FK
        bigint status_id FK
        varchar name
        text description
        date due_date
        smallint position
    }
    funding {
        bigint id PK
        bigint organization_id FK
        varchar type
        varchar name
        varchar funder
        varchar program
        varchar agreement_number
        decimal amount_total
        varchar currency
        date start_date
        date end_date
        date reporting_deadline
    }
    project_funding {
        bigint id PK
        bigint project_id FK
        bigint funding_id FK
        date allocation_start
        date allocation_end
        bool is_primary
        text note
    }
    funding_task {
        bigint id PK
        bigint funding_id FK
        bigint default_status_id FK
        varchar title
        text description
        smallint default_priority "1..5"
        decimal default_est_hours
        int default_due_days
        bool mandatory
    }
    task {
        bigint id PK
        bigint project_id FK "dawne task_scope"
        bigint project_funding_id FK "null = poza grantem"
        bigint milestone_id FK
        bigint parent_id FK "podzadanie"
        bigint template_id FK
        bigint status_id FK
        varchar status_category "kopia, złożony FK"
        smallint priority "1..5 CHECK"
        varchar title
        text description
        date start_date
        date due_date
        decimal est_hours
        bigint created_by_id FK
        timestamp completed_at
        timestamp created_at
        timestamp updated_at
    }
    task_assignment {
        bigint id PK
        bigint task_id FK
        bigint member_id FK
        bigint assigned_by_id FK
        timestamp assigned_at
        timestamp started_at
        timestamp finished_at
        decimal worked_hours
    }
    checklist {
        bigint id PK
        bigint task_id FK
        varchar title
        smallint position
    }
    checklist_item {
        bigint id PK
        bigint checklist_id FK
        varchar text
        smallint position
        bigint assignee_id FK
        bigint done_by_id FK
        timestamp done_at
    }
```

## 4. Współpraca, koszty i historia

```mermaid
erDiagram
    task |o--o{ comment : "task"
    project |o--o{ comment : "project"
    comment |o--o{ comment : "parent"
    organization_member ||--o{ comment : "author"
    task |o--o{ attachment : "task"
    comment |o--o{ attachment : "comment"
    expense |o--o{ attachment : "expense"
    organization_member ||--o{ attachment : "uploaded_by"
    project ||--o{ expense : "project"
    project_funding |o--o{ expense : "project_funding"
    task |o--o{ expense : "task"
    organization_member ||--o{ expense : "created_by"
    organization ||--o{ activity_log : "organization"
    project |o--o{ activity_log : "project"
    user |o--o{ activity_log : "actor"
    django_content_type ||--o{ activity_log : "content_type"
    activity_log ||--o{ notification : "activity"
    organization_member ||--o{ notification : "recipient"

    comment {
        bigint id PK
        bigint task_id FK "dokładnie jedno"
        bigint project_id FK "z tych dwóch (CHECK)"
        bigint parent_id FK
        bigint author_id FK
        text content
        bool is_edited
        timestamp created_at
        timestamp modified_at
    }
    attachment {
        bigint id PK
        bigint task_id FK "dokładnie jedno"
        bigint comment_id FK "z tych trzech"
        bigint expense_id FK "(CHECK)"
        bigint uploaded_by_id FK
        varchar file
        varchar original_name
        varchar mime
        bigint size
        timestamp uploaded_at
    }
    expense {
        bigint id PK
        bigint project_id FK
        bigint project_funding_id FK "null = koszt własny"
        bigint task_id FK
        varchar category
        decimal amount
        varchar currency
        date spent_on
        varchar document_number
        text description
        bigint created_by_id FK
        timestamp created_at
    }
    activity_log {
        bigint id PK
        bigint organization_id FK "zawsze"
        bigint project_id FK "opcjonalnie"
        bigint actor_id FK "user"
        int content_type_id FK
        bigint object_id
        varchar action
        jsonb changes
        timestamp created_at
    }
    notification {
        bigint id PK
        bigint recipient_id FK "member"
        bigint activity_id FK
        timestamp read_at
    }
    django_content_type {
        int id PK
        varchar app_label
        varchar model
    }
```

## 5. Optymalizacja – jak wyglądają typowe zapytania

Złożony FK pilnuje, że kopia kategorii w zadaniu zawsze zgadza się ze statusem
(Django nie ma złożonych FK – dodajemy je w migracji przez `RunSQL`):

```sql
ALTER TABLE status ADD CONSTRAINT status_id_category_uq UNIQUE (id, category);
ALTER TABLE task ADD CONSTRAINT task_status_fk
    FOREIGN KEY (status_id, status_category) REFERENCES status (id, category)
    ON UPDATE CASCADE;   -- zmiana kategorii podstatusu sama poprawi zadania
ALTER TABLE task ADD CONSTRAINT task_priority_ck CHECK (priority BETWEEN 1 AND 5);
```

„Moje otwarte zadania w firmie, od najważniejszych” – **jeden JOIN**, bez statusów i priorytetów:

```sql
SELECT t.id, t.title, t.priority, t.due_date
FROM task t
JOIN task_assignment a ON a.task_id = t.id
WHERE a.member_id = :member
  AND t.status_category IN ('todo', 'in_progress')
ORDER BY t.priority DESC, t.due_date;
```

Indeksy:

```sql
CREATE INDEX task_board_ix   ON task (project_id, status_category, priority DESC, due_date);
CREATE INDEX task_overdue_ix ON task (due_date) WHERE status_category IN ('todo', 'in_progress');
CREATE INDEX assignment_ix   ON task_assignment (member_id, task_id);
```

Kanban projektu dołącza `status` tylko po nazwę i kolor podstatusu – to tabela
z kilkunastoma wierszami, którą frontend i tak trzyma w cache.
