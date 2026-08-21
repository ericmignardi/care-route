CREATE TABLE clients (
    id           UUID         PRIMARY KEY,
    first_name   VARCHAR(100) NOT NULL,
    last_name    VARCHAR(100) NOT NULL,
    phone        VARCHAR(30),
    address_line VARCHAR(255) NOT NULL,
    city         VARCHAR(100) NOT NULL,
    postal_code  VARCHAR(10)  NOT NULL,
    status       VARCHAR(20)  NOT NULL,
    created_at   TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    updated_at   TIMESTAMP(6) WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_clients_last_name ON clients (last_name);

CREATE TABLE caregivers (
    id         UUID        PRIMARY KEY,
    user_id    UUID        NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    phone      VARCHAR(30),
    status     VARCHAR(20) NOT NULL,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL
);

CREATE TABLE caregiver_skills (
    caregiver_id UUID        NOT NULL REFERENCES caregivers (id) ON DELETE CASCADE,
    skill        VARCHAR(30) NOT NULL,
    PRIMARY KEY (caregiver_id, skill)
);

CREATE TABLE availability (
    id           UUID        PRIMARY KEY,
    caregiver_id UUID        NOT NULL REFERENCES caregivers (id) ON DELETE CASCADE,
    day_of_week  VARCHAR(10) NOT NULL,
    start_time   TIME(6)     NOT NULL,
    end_time     TIME(6)     NOT NULL,
    CONSTRAINT ck_availability_window CHECK (end_time > start_time),
    CONSTRAINT uq_availability_slot UNIQUE (caregiver_id, day_of_week, start_time)
);

CREATE INDEX idx_availability_caregiver ON availability (caregiver_id);

CREATE TABLE care_plan_tasks (
    id          UUID         PRIMARY KEY,
    client_id   UUID         NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    sort_order  INTEGER      NOT NULL,
    created_at  TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    updated_at  TIMESTAMP(6) WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_care_plan_tasks_client ON care_plan_tasks (client_id);

CREATE TABLE visits (
    id              UUID         PRIMARY KEY,
    client_id       UUID         NOT NULL REFERENCES clients (id),
    caregiver_id    UUID         REFERENCES caregivers (id),
    scheduled_start TIMESTAMP(6) NOT NULL,
    scheduled_end   TIMESTAMP(6) NOT NULL,
    required_skill  VARCHAR(30)  NOT NULL,
    status          VARCHAR(20)  NOT NULL,
    checked_in_at   TIMESTAMP(6) WITH TIME ZONE,
    checked_out_at  TIMESTAMP(6) WITH TIME ZONE,
    notes           VARCHAR(2000),
    version         INTEGER      NOT NULL,
    created_at      TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    updated_at      TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    CONSTRAINT ck_visits_window CHECK (scheduled_end > scheduled_start)
);

CREATE INDEX idx_visits_caregiver_start ON visits (caregiver_id, scheduled_start);
CREATE INDEX idx_visits_client_start ON visits (client_id, scheduled_start);
CREATE INDEX idx_visits_start ON visits (scheduled_start);

CREATE TABLE visit_tasks (
    id           UUID         PRIMARY KEY,
    visit_id     UUID         NOT NULL REFERENCES visits (id) ON DELETE CASCADE,
    description  VARCHAR(255) NOT NULL,
    sort_order   INTEGER      NOT NULL,
    completed    BOOLEAN      NOT NULL,
    completed_at TIMESTAMP(6) WITH TIME ZONE
);

CREATE INDEX idx_visit_tasks_visit ON visit_tasks (visit_id);
