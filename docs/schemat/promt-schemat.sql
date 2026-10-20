-- PROMT – schemat bazy (propozycja, PostgreSQL 15+)
-- 22 tabele + widok zmaterializowany uprawnień + trigger dopinający zadania z szablonów.
-- Uruchomienie na czystej bazie:  psql -d <baza> -f promt-schemat.sql
-- Docelowo tabele powstaną z modeli Django i migracji – ten plik to wersja do przeglądu i testów.

BEGIN;

-- ── Firma, ludzie i uprawnienia ─────────────────────────────────────────────

CREATE TABLE "user" (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         varchar(254) NOT NULL UNIQUE,              -- login
    password      varchar(128) NOT NULL,
    first_name    varchar(150) NOT NULL DEFAULT '',
    last_name     varchar(150) NOT NULL DEFAULT '',
    is_active     boolean      NOT NULL DEFAULT true,
    is_staff      boolean      NOT NULL DEFAULT false,
    is_superuser  boolean      NOT NULL DEFAULT false,       -- Admin systemu
    last_login    timestamptz,
    date_joined   timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE organization (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        varchar(200) NOT NULL,
    tax_id      varchar(20),                                 -- NIP / VAT ID
    is_active   boolean      NOT NULL DEFAULT true,
    settings    jsonb        NOT NULL DEFAULT '{}',          -- np. nazwy priorytetów, waluta, strefa czasowa
    created_at  timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX organization_tax_id_uq ON organization (tax_id) WHERE tax_id IS NOT NULL;

CREATE TABLE organization_member (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id  bigint       NOT NULL REFERENCES organization ON DELETE CASCADE,
    user_id          bigint       NOT NULL REFERENCES "user" ON DELETE CASCADE,
    email            varchar(254),                           -- służbowy w tej firmie
    phone            varchar(32),
    job_title        varchar(120),
    avatar_url       varchar(500),
    status           varchar(12)  NOT NULL DEFAULT 'active'
                     CHECK (status IN ('invited', 'active', 'suspended', 'left')),
    joined_at        timestamptz,
    UNIQUE (organization_id, user_id)
);
CREATE INDEX organization_member_user_ix ON organization_member (user_id);

CREATE TABLE project (
    id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id    bigint       NOT NULL REFERENCES organization ON DELETE CASCADE,
    owner_id           bigint       REFERENCES organization_member ON DELETE SET NULL,
    name               varchar(200) NOT NULL,
    description        text         NOT NULL DEFAULT '',
    status             varchar(20)  NOT NULL DEFAULT 'active',
    start_date         date,
    end_date           date,
    hidden_status_ids  bigint[]     NOT NULL DEFAULT '{}',   -- statusy firmy wyłączone w tym projekcie
    created_at         timestamptz  NOT NULL DEFAULT now(),
    updated_at         timestamptz  NOT NULL DEFAULT now(),
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX project_organization_ix ON project (organization_id);
CREATE INDEX project_owner_ix ON project (owner_id);

CREATE TABLE member_group (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id  bigint       REFERENCES organization ON DELETE CASCADE,   -- grupa firmowa ALBO
    project_id       bigint       REFERENCES project ON DELETE CASCADE,        -- grupa projektowa
    parent_id        bigint       REFERENCES member_group ON DELETE CASCADE,   -- grupa nadrzędna
    name             varchar(120) NOT NULL,
    description      text,
    created_at       timestamptz  NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(organization_id, project_id) = 1),
    UNIQUE (organization_id, name),
    UNIQUE (project_id, name)
);
CREATE INDEX member_group_parent_ix ON member_group (parent_id);

CREATE TABLE member_group_member (
    group_id   bigint      NOT NULL REFERENCES member_group ON DELETE CASCADE,
    member_id  bigint      NOT NULL REFERENCES organization_member ON DELETE CASCADE,
    added_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, member_id)
);
CREATE INDEX member_group_member_member_ix ON member_group_member (member_id);

CREATE TABLE role (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id  bigint       REFERENCES organization ON DELETE CASCADE,   -- NULL = rola wbudowana
    name             varchar(120) NOT NULL,
    scope            varchar(12)  NOT NULL CHECK (scope IN ('organization', 'project')),
    permissions      varchar[]    NOT NULL DEFAULT '{}',                       -- np. {expense.create, task.edit}
    UNIQUE NULLS NOT DISTINCT (organization_id, name)
);
CREATE INDEX role_permissions_gin ON role USING gin (permissions);

CREATE TABLE role_assignment (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id     bigint      NOT NULL REFERENCES role ON DELETE CASCADE,
    member_id   bigint      REFERENCES organization_member ON DELETE CASCADE,  -- osoba ALBO
    group_id    bigint      REFERENCES member_group ON DELETE CASCADE,         -- grupa
    project_id  bigint      REFERENCES project ON DELETE CASCADE,              -- NULL = cała firma
    created_at  timestamptz NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(member_id, group_id) = 1),
    UNIQUE NULLS NOT DISTINCT (role_id, member_id, group_id, project_id)
);
CREATE INDEX role_assignment_member_ix ON role_assignment (member_id);
CREATE INDEX role_assignment_group_ix ON role_assignment (group_id);
CREATE INDEX role_assignment_project_ix ON role_assignment (project_id);

-- ── Statusy ─────────────────────────────────────────────────────────────────

CREATE TABLE task_status (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id  bigint      REFERENCES organization ON DELETE CASCADE,    -- status firmy ALBO
    project_id       bigint      REFERENCES project ON DELETE CASCADE,         -- status projektu
    category         varchar(12) NOT NULL
                     CHECK (category IN ('todo', 'in_progress', 'done', 'cancelled')),
    name             varchar(60) NOT NULL,                                     -- etykieta, np. In Development
    color            varchar(9)  NOT NULL DEFAULT '#94a3b8',
    position         smallint    NOT NULL DEFAULT 0,
    is_default       boolean     NOT NULL DEFAULT false,
    is_active        boolean     NOT NULL DEFAULT true,
    CHECK (num_nonnulls(organization_id, project_id) = 1),
    UNIQUE (organization_id, name),
    UNIQUE (project_id, name)
);

-- ── Projekty i finansowanie ─────────────────────────────────────────────────

CREATE TABLE milestone (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id  bigint       NOT NULL REFERENCES project ON DELETE CASCADE,
    name        varchar(200) NOT NULL,
    status      varchar(12)  NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'done')),
    due_date    date,
    position    smallint     NOT NULL DEFAULT 0
);
CREATE INDEX milestone_project_ix ON milestone (project_id, position);

CREATE TABLE funding (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id     bigint        NOT NULL REFERENCES organization ON DELETE CASCADE,
    type                varchar(40)   NOT NULL,
    name                varchar(200)  NOT NULL,
    funder              varchar(200)  NOT NULL DEFAULT '',
    program             varchar(200)  NOT NULL DEFAULT '',
    agreement_number    varchar(100)  NOT NULL DEFAULT '',
    amount_total        numeric(14,2) NOT NULL DEFAULT 0,
    currency            char(3)       NOT NULL DEFAULT 'PLN',
    start_date          date,
    end_date            date,
    reporting_deadline  date,
    description         text          NOT NULL DEFAULT '',
    created_at          timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX funding_organization_ix ON funding (organization_id);

CREATE TABLE project_funding (
    id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id        bigint      NOT NULL REFERENCES project ON DELETE CASCADE,
    funding_id        bigint      NOT NULL REFERENCES funding ON DELETE CASCADE,
    allocation_start  date,
    allocation_end    date,
    is_primary        boolean     NOT NULL DEFAULT false,
    note              text        NOT NULL DEFAULT '',
    created_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, funding_id),
    UNIQUE (id, project_id)                                  -- cel złożonego FK z task
);
CREATE INDEX project_funding_funding_ix ON project_funding (funding_id);

CREATE TABLE task_template (                                 -- w bazie: funding_task
    id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    funding_id         bigint       NOT NULL REFERENCES funding ON DELETE CASCADE,
    title              varchar(200) NOT NULL,
    description        text         NOT NULL DEFAULT '',
    default_status_id  bigint       REFERENCES task_status ON DELETE SET NULL,
    default_priority   smallint     NOT NULL DEFAULT 3 CHECK (default_priority BETWEEN 1 AND 5),
    default_est_hours  numeric(6,2),
    default_due_days   integer,
    mandatory          boolean      NOT NULL DEFAULT false
);
CREATE INDEX task_template_funding_ix ON task_template (funding_id);
CREATE INDEX task_template_status_ix ON task_template (default_status_id);

-- ── Zadania ─────────────────────────────────────────────────────────────────

CREATE TABLE task (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id          bigint       REFERENCES project ON DELETE CASCADE,          -- zadanie projektu ALBO
    funding_id          bigint       REFERENCES funding ON DELETE CASCADE,          -- zadanie samego grantu
    project_funding_id  bigint,                                                     -- grant w projekcie
    milestone_id        bigint       REFERENCES milestone ON DELETE SET NULL,
    parent_id           bigint       REFERENCES task ON DELETE CASCADE,             -- podzadanie
    template_id         bigint       REFERENCES task_template ON DELETE SET NULL,   -- z jakiego szablonu
    status_id           bigint       NOT NULL REFERENCES task_status ON DELETE RESTRICT,
    group_id            bigint       REFERENCES member_group ON DELETE SET NULL,    -- zadanie dla grupy
    title               varchar(200) NOT NULL,
    description         text         NOT NULL DEFAULT '',
    priority            smallint     NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    start_date          date,
    due_date            date,
    est_hours           numeric(6,2),
    created_at          timestamptz  NOT NULL DEFAULT now(),
    updated_at          timestamptz  NOT NULL DEFAULT now(),
    CHECK ((project_id IS NULL) <> (funding_id IS NULL)),
    CHECK (project_funding_id IS NULL OR project_id IS NOT NULL),
    FOREIGN KEY (project_funding_id, project_id) REFERENCES project_funding (id, project_id) ON DELETE CASCADE
);
CREATE INDEX task_project_status_ix ON task (project_id, status_id, priority DESC);
CREATE INDEX task_funding_ix ON task (funding_id);
CREATE INDEX task_project_funding_ix ON task (project_funding_id);
CREATE INDEX task_milestone_ix ON task (milestone_id);
CREATE INDEX task_parent_ix ON task (parent_id);
CREATE INDEX task_template_ix ON task (template_id);
CREATE INDEX task_status_ix ON task (status_id);
CREATE INDEX task_group_ix ON task (group_id);
CREATE INDEX task_due_ix ON task (due_date);

CREATE TABLE task_assignment (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id         bigint      NOT NULL REFERENCES task ON DELETE CASCADE,
    member_id       bigint      NOT NULL REFERENCES organization_member ON DELETE CASCADE,
    assigned_by_id  bigint      REFERENCES organization_member ON DELETE SET NULL,
    assigned_at     timestamptz NOT NULL DEFAULT now(),
    started_at      timestamptz,
    finished_at     timestamptz,
    UNIQUE (task_id, member_id),
    CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at)
);
CREATE INDEX task_assignment_member_ix ON task_assignment (member_id);
CREATE INDEX task_assignment_assigned_by_ix ON task_assignment (assigned_by_id);

CREATE TABLE time_entry (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    assignment_id  bigint       NOT NULL REFERENCES task_assignment ON DELETE CASCADE,
    work_date      date         NOT NULL,
    hours          numeric(5,2) NOT NULL CHECK (hours > 0),
    started_at     timestamptz,
    finished_at    timestamptz,
    note           text,
    created_at     timestamptz  NOT NULL DEFAULT now(),
    updated_at     timestamptz  NOT NULL DEFAULT now(),
    CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at > started_at)
);
CREATE INDEX time_entry_assignment_ix ON time_entry (assignment_id, work_date);

CREATE TABLE checklist_item (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id      bigint       NOT NULL REFERENCES task ON DELETE CASCADE,
    section      varchar(120),                                -- nazwa listy w zadaniu
    title        varchar(300) NOT NULL,
    position     smallint     NOT NULL DEFAULT 0,
    assignee_id  bigint       REFERENCES organization_member ON DELETE SET NULL,
    done_by_id   bigint       REFERENCES organization_member ON DELETE SET NULL,
    done_at      timestamptz
);
CREATE INDEX checklist_item_task_ix ON checklist_item (task_id, section, position);
CREATE INDEX checklist_item_assignee_ix ON checklist_item (assignee_id);
CREATE INDEX checklist_item_done_by_ix ON checklist_item (done_by_id);

-- ── Współpraca, koszty i historia ───────────────────────────────────────────

CREATE TABLE comment (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id     bigint      REFERENCES task ON DELETE CASCADE,                  -- zadanie ALBO
    project_id  bigint      REFERENCES project ON DELETE CASCADE,               -- projekt
    author_id   bigint      NOT NULL REFERENCES organization_member ON DELETE RESTRICT,
    parent_id   bigint      REFERENCES comment ON DELETE CASCADE,               -- odpowiedź
    content     text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(task_id, project_id) = 1)
);
CREATE INDEX comment_task_ix ON comment (task_id, created_at);
CREATE INDEX comment_project_ix ON comment (project_id, created_at);
CREATE INDEX comment_author_ix ON comment (author_id);
CREATE INDEX comment_parent_ix ON comment (parent_id);

CREATE TABLE expense (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id          bigint        REFERENCES project ON DELETE CASCADE,         -- koszt własny ALBO
    project_funding_id  bigint        REFERENCES project_funding ON DELETE CASCADE, -- rozliczany z finansowania
    task_id             bigint        REFERENCES task ON DELETE SET NULL,           -- koszt zadania
    type                varchar(40)   NOT NULL,
    amount              numeric(14,2) NOT NULL CHECK (amount > 0),
    currency            char(3)       NOT NULL DEFAULT 'PLN',
    spent_on            date          NOT NULL,
    document_number     varchar(100),
    description         text          NOT NULL DEFAULT '',
    created_by_id       bigint        NOT NULL REFERENCES organization_member ON DELETE RESTRICT,
    created_at          timestamptz   NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(project_id, project_funding_id) = 1)
);
CREATE INDEX expense_project_ix ON expense (project_id, spent_on);
CREATE INDEX expense_project_funding_ix ON expense (project_funding_id);
CREATE INDEX expense_task_ix ON expense (task_id);
CREATE INDEX expense_created_by_ix ON expense (created_by_id);

CREATE TABLE attachment (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id         bigint       REFERENCES task ON DELETE CASCADE,              -- dokładnie jedno
    comment_id      bigint       REFERENCES comment ON DELETE CASCADE,           -- z tych
    expense_id      bigint       REFERENCES expense ON DELETE CASCADE,           -- trzech
    uploaded_by_id  bigint       NOT NULL REFERENCES organization_member ON DELETE RESTRICT,
    file            varchar(500) NOT NULL,
    original_name   varchar(255) NOT NULL,
    mime_type       varchar(100) NOT NULL,
    size_bytes      bigint       NOT NULL CHECK (size_bytes >= 0),
    created_at      timestamptz  NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(task_id, comment_id, expense_id) = 1)
);
CREATE INDEX attachment_task_ix ON attachment (task_id);
CREATE INDEX attachment_comment_ix ON attachment (comment_id);
CREATE INDEX attachment_expense_ix ON attachment (expense_id);
CREATE INDEX attachment_uploaded_by_ix ON attachment (uploaded_by_id);

CREATE TABLE activity_log (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id  bigint      NOT NULL REFERENCES organization ON DELETE CASCADE,
    actor_id         bigint      REFERENCES organization_member ON DELETE SET NULL,
    entity_type      varchar(40) NOT NULL,                     -- task / project / expense …
    entity_id        bigint      NOT NULL,
    action           varchar(40) NOT NULL,                     -- created / status_changed …
    changes          jsonb       NOT NULL DEFAULT '{}',
    created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_log_entity_ix ON activity_log (entity_type, entity_id, created_at);
CREATE INDEX activity_log_org_ix ON activity_log (organization_id, created_at);
CREATE INDEX activity_log_actor_ix ON activity_log (actor_id);

CREATE TABLE notification (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    activity_id   bigint      NOT NULL REFERENCES activity_log ON DELETE CASCADE,
    recipient_id  bigint      NOT NULL REFERENCES organization_member ON DELETE CASCADE,
    read_at       timestamptz,
    UNIQUE (activity_id, recipient_id)
);
CREATE INDEX notification_unread_ix ON notification (recipient_id) WHERE read_at IS NULL;

-- ── Uprawnienia efektywne: role własne + role grup i grup nadrzędnych ───────
-- Odświeżanie po zmianie ról lub grup:  REFRESH MATERIALIZED VIEW CONCURRENTLY member_permission;

CREATE MATERIALIZED VIEW member_permission AS
WITH RECURSIVE member_groups AS (
    SELECT gm.member_id, g.id AS group_id, g.parent_id
    FROM member_group_member gm
    JOIN member_group g ON g.id = gm.group_id
    UNION
    SELECT mg.member_id, p.id, p.parent_id
    FROM member_groups mg
    JOIN member_group p ON p.id = mg.parent_id
),
grants AS (
    SELECT ra.member_id, ra.project_id, ra.role_id
    FROM role_assignment ra
    WHERE ra.member_id IS NOT NULL
    UNION ALL
    SELECT mg.member_id, ra.project_id, ra.role_id
    FROM role_assignment ra
    JOIN member_groups mg ON mg.group_id = ra.group_id
)
SELECT g.member_id, g.project_id, array_agg(DISTINCT perm ORDER BY perm) AS permissions
FROM grants g
JOIN role r ON r.id = g.role_id
CROSS JOIN LATERAL unnest(r.permissions) AS perm
GROUP BY g.member_id, g.project_id;

CREATE UNIQUE INDEX member_permission_uq ON member_permission (member_id, project_id) NULLS NOT DISTINCT;

-- ── Szablony: podpięcie finansowania do projektu tworzy zadania z szablonów ─
-- W aplikacji to zadanie serwisu; trigger to ta sama logika po stronie bazy.

CREATE FUNCTION create_tasks_from_templates() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO task (project_id, project_funding_id, template_id, status_id, title, description,
                      priority, due_date, est_hours)
    SELECT NEW.project_id, NEW.id, t.id,
           COALESCE(t.default_status_id,
                    (SELECT s.id FROM task_status s
                     JOIN project p ON p.organization_id = s.organization_id
                     WHERE p.id = NEW.project_id AND s.category = 'todo' AND s.is_default
                     LIMIT 1)),
           t.title, t.description, t.default_priority,
           CASE WHEN t.default_due_days IS NOT NULL
                THEN COALESCE(NEW.allocation_start, current_date) + t.default_due_days END,
           t.default_est_hours
    FROM task_template t
    WHERE t.funding_id = NEW.funding_id;
    RETURN NEW;
END $$;

CREATE TRIGGER project_funding_create_tasks
AFTER INSERT ON project_funding
FOR EACH ROW EXECUTE FUNCTION create_tasks_from_templates();

COMMIT;
