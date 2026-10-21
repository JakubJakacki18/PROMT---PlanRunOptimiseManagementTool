# PROMT – diagramy całej aplikacji (Mermaid)

Wygenerowane z danych strony UML (wersja docelowa). Podgląd w VS Code: `Ctrl+Shift+V`.

## 1. Architektura: monolit + PostgreSQL + MongoDB

```mermaid
flowchart LR
    FE["React + RTK Query"] -- "REST / JSON" --> API
    subgraph DJ["Django – monolit"]
        API["Widoki DRF<br/>serializery"] --> ACC["access.can()<br/>uprawnienia"]
        API --> LOG["log_and_notify()<br/>zdarzenia Pydantic"]
        LOG --> NOSQL["api/nosql/<br/>repozytoria pymongo"]
        CMD["manage.py process_outbox"] --> NOSQL
    end
    API -- "ORM, transakcja" --> PG[("PostgreSQL<br/>~25 tabel + outbox")]
    ACC -- "role, uprawnienia" --> PG
    LOG -- "wiersz outbox<br/>(ta sama transakcja)" --> PG
    CMD -- "czyta oczekujące" --> PG
    NOSQL -- "insert / upsert" --> MG[("MongoDB<br/>activity, notifications,<br/>project_dashboard")]
    API -- "historia, powiadomienia,<br/>dashboard" --> NOSQL
```

## 2. Diagram ER – przegląd wszystkich relacji

```mermaid
erDiagram
    auth_user ||--o| user_profile : "user"
    organization ||--o{ organization_member : "organization"
    auth_user ||--o{ organization_member : "user"
    auth_user |o--o{ organization_member : "invited_by"
    organization |o--o{ status : "organization"
    organization |o--o{ team : "organization"
    project |o--o{ team : "project"
    team |o--o{ team : "parent"
    auth_user ||--o{ team : "created_by"
    team ||--o{ team_member : "team"
    auth_user ||--o{ team_member : "user"
    auth_user |o--o{ team_member : "added_by"
    role ||--o{ role_assignment : "role"
    auth_user |o--o{ role_assignment : "user"
    team |o--o{ role_assignment : "team"
    organization |o--o{ role_assignment : "organization"
    project |o--o{ role_assignment : "project"
    auth_user |o--o{ role_assignment : "granted_by"
    organization |o--o{ role : "organization"
    role ||--o{ role_permission : "role"
    permission ||--o{ role_permission : "permission"
    organization ||--o{ project : "organization"
    auth_user ||--o{ project : "owner"
    organization ||--o{ funding : "organization"
    project ||--o{ project_funding : "project"
    funding ||--o{ project_funding : "funding"
    funding ||--o{ funding_task : "funding"
    status |o--o{ funding_task : "default_status"
    status ||--o{ task : "status"
    milestone |o--o{ task : "milestone"
    task |o--o{ task : "parent"
    funding_task |o--o{ task : "template"
    task ||--o| task_scope : "task"
    project ||--o{ task_scope : "project"
    funding |o--o{ task_scope : "funding"
    project_funding |o--o{ task_scope : "project_funding"
    task ||--o{ task_assignment : "task"
    auth_user ||--o{ task_assignment : "user"
    auth_user |o--o{ task_assignment : "assigned_by"
    project ||--o{ milestone : "project"
    status ||--o{ milestone : "status"
    task ||--o{ checklist : "task"
    checklist ||--o{ checklist_item : "checklist"
    auth_user |o--o{ checklist_item : "assignee"
    auth_user |o--o{ checklist_item : "done_by"
    auth_user ||--o{ notification : "recipient"
    activity_log ||--o{ notification : "activity"
    auth_user |o--o{ activity_log : "actor"
    organization ||--o{ activity_log : "organization"
    project |o--o{ activity_log : "project"
    django_content_type |o--o{ activity_log : "content_type"
    auth_user ||--o{ comments : "author"
    comments |o--o{ comments : "parent_comment"
    django_content_type ||--o{ comments : "content_type"
    django_content_type ||--o{ attachments : "content_type"
    django_content_type ||--o{ expenses : "content_type"
```

## 3. Diagram ER – Dostęp i organizacja

```mermaid
erDiagram
    auth_user ||--o| user_profile : "user"
    organization ||--o{ organization_member : "organization"
    auth_user ||--o{ organization_member : "user"
    auth_user |o--o{ organization_member : "invited_by"
    organization |o--o{ status : "organization"
    organization |o--o{ team : "organization"
    project |o--o{ team : "project"
    team |o--o{ team : "parent"
    auth_user ||--o{ team : "created_by"
    team ||--o{ team_member : "team"
    auth_user ||--o{ team_member : "user"
    auth_user |o--o{ team_member : "added_by"
    role ||--o{ role_assignment : "role"
    auth_user |o--o{ role_assignment : "user"
    team |o--o{ role_assignment : "team"
    organization |o--o{ role_assignment : "organization"
    project |o--o{ role_assignment : "project"
    auth_user |o--o{ role_assignment : "granted_by"
    organization |o--o{ role : "organization"
    role ||--o{ role_permission : "role"
    permission ||--o{ role_permission : "permission"
    auth_user {
        int id PK
        varchar username
        varchar email
        bool is_superuser
    }
    user_profile {
        bigint id PK
        bigint user_id FK "→ user 1:1"
        varchar phone
        varchar avatar_url
    }
    organization {
        bigint id PK
        varchar name
        varchar slug UK
        varchar tax_id
        varchar contact_email
        bool is_active
        timestamp created_at
    }
    organization_member {
        bigint id PK
        bigint organization_id FK "→ organization"
        bigint user_id FK "→ user"
        bool is_active
        bigint invited_by_id FK "→ user"
        timestamp joined_at
    }
    role {
        bigint id PK
        bigint organization_id FK "→ organization"
        varchar code
        varchar name
        varchar description
        varchar scope
    }
    permission {
        bigint id PK
        varchar code UK
        varchar description
        varchar scope
    }
    role_permission {
        bigint id PK
        bigint role_id FK "→ role"
        bigint permission_id FK "→ permission"
    }
    team {
        bigint id PK
        bigint organization_id FK "→ organization"
        bigint project_id FK "→ project"
        bigint parent_id FK "→ team"
        varchar name
        text description
        bigint created_by_id FK "→ user"
        timestamp created_at
    }
    team_member {
        bigint id PK
        bigint team_id FK "→ team"
        bigint user_id FK "→ user"
        bigint added_by_id FK "→ user"
        timestamp joined_at
    }
    role_assignment {
        bigint id PK
        bigint role_id FK "→ role"
        bigint user_id FK "→ user"
        bigint team_id FK "→ team"
        bigint organization_id FK "→ organization"
        bigint project_id FK "→ project"
        bigint granted_by_id FK "→ user"
        timestamp created_at
    }
    status {
        bigint id PK
        bigint organization_id FK "→ organization"
        varchar applies_to
        varchar code
        varchar name
        varchar category
        smallint position
        varchar color
        bool is_default
    }
```

## 4. Diagram ER – Projekty, finansowanie i zadania

```mermaid
erDiagram
    organization ||--o{ project : "organization"
    auth_user ||--o{ project : "owner"
    organization ||--o{ funding : "organization"
    project ||--o{ project_funding : "project"
    funding ||--o{ project_funding : "funding"
    funding ||--o{ funding_task : "funding"
    status |o--o{ funding_task : "default_status"
    status ||--o{ task : "status"
    milestone |o--o{ task : "milestone"
    task |o--o{ task : "parent"
    funding_task |o--o{ task : "template"
    task ||--o| task_scope : "task"
    project ||--o{ task_scope : "project"
    funding |o--o{ task_scope : "funding"
    project_funding |o--o{ task_scope : "project_funding"
    task ||--o{ task_assignment : "task"
    auth_user ||--o{ task_assignment : "user"
    auth_user |o--o{ task_assignment : "assigned_by"
    project ||--o{ milestone : "project"
    status ||--o{ milestone : "status"
    task ||--o{ checklist : "task"
    checklist ||--o{ checklist_item : "checklist"
    auth_user |o--o{ checklist_item : "assignee"
    auth_user |o--o{ checklist_item : "done_by"
    project {
        bigint id PK
        bigint organization_id FK "→ organization"
        bigint owner_id FK "→ user"
        varchar name
        text description
        varchar status
        date start_date
        date end_date
        timestamp created_at
        timestamp updated_at
    }
    milestone {
        bigint id PK
        bigint project_id FK "→ project"
        bigint status_id FK "→ status"
        varchar name
        text description
        date due_date
        timestamp created_at
        timestamp updated_at
    }
    funding {
        bigint id PK
        bigint organization_id FK "→ organization"
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
        text description
        timestamp created_at
    }
    project_funding {
        bigint id PK
        bigint project_id FK "→ project"
        bigint funding_id FK "→ funding"
        date allocation_start
        date allocation_end
        bool is_primary
        text note
        timestamp created_at
    }
    funding_task {
        bigint id PK
        bigint funding_id FK "→ funding"
        bigint default_status_id FK "→ status"
        varchar title
        text description
        int default_priority
        decimal default_est_hours
        int default_due_days
        bool mandatory
    }
    task {
        bigint id PK
        bigint status_id FK "→ status"
        bigint milestone_id FK "→ milestone"
        bigint parent_id FK "→ task"
        bigint template_id FK "→ funding_task"
        varchar title
        text description
        int priority
        date start_date
        date due_date
        decimal cost_amount
        varchar cost_currency
        varchar receipt_url
        text receipt_note
        decimal est_hours
        timestamp created_at
        timestamp updated_at
    }
    task_scope {
        bigint id PK
        bigint task_id FK "→ task 1:1"
        bigint project_id FK "→ project"
        bigint funding_id FK "→ funding"
        bigint project_funding_id FK "→ proj_funding"
        bool funding_scoped
        timestamp created_at
    }
    task_assignment {
        bigint id PK
        bigint task_id FK "→ task"
        bigint user_id FK "→ user"
        bigint assigned_by_id FK "→ user"
        timestamp assigned_at
        timestamp started_at
        timestamp finished_at
        decimal worked_hours
    }
    checklist {
        bigint id PK
        bigint task_id FK "→ task"
        varchar title
        int position
        timestamp created_at
    }
    checklist_item {
        bigint id PK
        bigint checklist_id FK "→ checklist"
        varchar text
        int position
        bigint assignee_id FK "→ user"
        bigint done_by_id FK "→ user"
        timestamp done_at
    }
```

## 5. Diagram ER – Historia, powiadomienia i relacje generyczne

```mermaid
erDiagram
    auth_user ||--o{ notification : "recipient"
    activity_log ||--o{ notification : "activity"
    auth_user |o--o{ activity_log : "actor"
    organization ||--o{ activity_log : "organization"
    project |o--o{ activity_log : "project"
    django_content_type |o--o{ activity_log : "content_type"
    auth_user ||--o{ comments : "author"
    comments |o--o{ comments : "parent_comment"
    django_content_type ||--o{ comments : "content_type"
    django_content_type ||--o{ attachments : "content_type"
    django_content_type ||--o{ expenses : "content_type"
    activity_log {
        bigint id PK
        bigint actor_id FK "→ user"
        bigint organization_id FK "→ organization"
        bigint project_id FK "→ project"
        bigint content_type_id FK "→ content_type"
        bigint object_id
        varchar action
        jsonb changes
        timestamp created_at
    }
    notification {
        bigint id PK
        bigint recipient_id FK "→ user"
        bigint activity_id FK "→ activity_log"
        timestamp read_at
    }
    comments {
        bigint id PK
        bigint author_id FK "→ user"
        bigint parent_comment_id FK "→ comments"
        bigint content_type_id FK "→ content_type"
        bigint object_id
        text content
        bool is_edited
        timestamp created_at
        timestamp modified_at
    }
    attachments {
        bigint id PK
        bigint content_type_id FK "→ content_type"
        bigint object_id
        varchar type
        varchar file
        text content
        timestamp uploaded_at
        timestamp modified_at
    }
    expenses {
        int id PK
        bigint content_type_id FK "→ content_type"
        bigint object_id
        varchar type
        decimal amount
        varchar currency
        text description
    }
    django_content_type {
        int id PK
        varchar app_label
        varchar model
    }
```

## 6. Role (każda wyższa ma wszystko z niższej)

```mermaid
flowchart TB
    SYS["Admin systemu"] --> ORG["Admin organizacji"] --> PM["PM"] --> PA["Admin projektu"] --> PMEM["Członek projektu"] --> OBS["Obserwator"] --> USR["Użytkownik"]
```

## 7. Przypadki użycia – co dochodzi na każdym poziomie

```mermaid
flowchart LR
    subgraph R0["Użytkownik"]
        direction TB
        R0_0(["Zaloguj się"])
        R0_1(["Edytuj swój profil"])
        R0_2(["Zmień hasło"])
        R0_3(["Przeglądaj powiadomienia"])
        R0_4(["Oznacz jako przeczytane"])
        R0_5(["Ustaw preferencje powiadomień"])
        R0_6(["Przełącz organizację"])
    end
    subgraph R1["Obserwator"]
        direction TB
        R1_0(["Przeglądaj projekty"])
        R1_1(["Przeglądaj szczegóły projektu"])
        R1_2(["Śledź postęp etapów"])
        R1_3(["Przeglądaj i filtruj zadania"])
        R1_4(["Przeglądaj tablicę Kanban"])
        R1_5(["Przeglądaj checklisty"])
        R1_6(["Czytaj komentarze i pliki"])
        R1_7(["Przeglądaj finansowania"])
        R1_8(["Przeglądaj zespół projektu"])
    end
    subgraph R2["Członek projektu"]
        direction TB
        R2_0(["Utwórz zadanie"])
        R2_1(["Edytuj swoje zadanie"])
        R2_2(["Zmień status swojego zadania"])
        R2_3(["Zgłoś zadanie do sprawdzenia"])
        R2_4(["Dodaj podzadanie"])
        R2_5(["Rejestruj czas pracy"])
        R2_6(["Odhacz swój punkt"])
        R2_7(["Komentuj"])
        R2_8(["Wspomnij @osobę"])
        R2_9(["Dodaj załącznik"])
    end
    subgraph R3["Admin projektu"]
        direction TB
        R3_0(["Edytuj projekt"])
        R3_1(["Zamknij lub usuń projekt"])
        R3_2(["Zarządzaj etapami"])
        R3_3(["Edytuj dowolne zadanie"])
        R3_4(["Przypisz osoby do zadania"])
        R3_5(["Zaakceptuj lub odrzuć zadanie"])
        R3_6(["Usuń zadanie"])
        R3_7(["Twórz i edytuj checklisty"])
        R3_8(["Przypisz osobę do punktu"])
        R3_9(["Moderuj komentarze"])
        R3_10(["Zarządzaj członkami projektu"])
        R3_11(["Zarządzaj grupami projektu"])
        R3_12(["Przeglądaj log projektu"])
    end
    subgraph R4["PM"]
        direction TB
        R4_0(["Utwórz projekt"])
        R4_1(["Dodaj i edytuj finansowanie"])
        R4_2(["Zarządzaj szablonami zadań"])
        R4_3(["Podepnij finansowanie do projektu"])
        R4_4(["Rejestruj wydatki"])
        R4_5(["Raport budżetu"])
        R4_6(["Dodaj pracownika do organizacji"])
        R4_7(["Nadaj niższą rolę"])
        R4_8(["Zarządzaj grupami organizacji"])
    end
    subgraph R5["Admin organizacji"]
        direction TB
        R5_0(["Nadaj dowolną rolę"])
        R5_1(["Zablokuj członka"])
        R5_2(["Twórz własne role"])
        R5_3(["Przeglądaj log organizacji"])
        R5_4(["Edytuj ustawienia organizacji"])
        R5_5(["Zarządzaj statusami"])
    end
    subgraph R6["Admin systemu"]
        direction TB
        R6_0(["Załóż organizację"])
        R6_1(["Zablokuj organizację"])
        R6_2(["Panel administracyjny"])
    end
    R1 -- "dziedziczy" --> R0
    R2 -- "dziedziczy" --> R1
    R3 -- "dziedziczy" --> R2
    R4 -- "dziedziczy" --> R3
    R5 -- "dziedziczy" --> R4
    R6 -- "dziedziczy" --> R5
```

## 8. Sekwencja: zmiana statusu zadania (Postgres + outbox + Mongo)

```mermaid
sequenceDiagram
    autonumber
    actor U as Członek projektu
    participant FE as React
    participant V as Django (widok)
    participant A as access.can()
    participant PG as PostgreSQL
    participant M as MongoDB
    U->>FE: przeciąga zadanie do „Do sprawdzenia”
    FE->>V: PATCH /api/tasks/42/ {status: "to_review"}
    V->>A: can(user, "task.change_status", projekt)
    A->>PG: role_assignment + role_permission
    PG-->>A: uprawnienie jest
    V->>PG: BEGIN · UPDATE task · INSERT outbox · COMMIT
    V-->>FE: 200 OK (nowy status)
    V->>M: on_commit: insert activity, notifications, update dashboard
    alt Mongo działa
        V->>PG: outbox.sent_at = now()
    else Mongo niedostępne
        Note over V,PG: wiersz czeka – ponowi go process_outbox
    end
```

## 9. Statusy zadań

Osobny plik: [statusy.md](statusy.md).
