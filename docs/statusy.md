# Statusy zadań – v2

Status główny = pole `category` (stała lista, na niej opiera się logika systemu):
**todo**, **in_progress**, **done**, **cancelled**.

Podstatus = wiersz w tabeli `status`. Wbudowane są kopiowane do każdej nowej organizacji;
firma może je zmieniać i dodawać własne, projekt może dodać swoje.
Przykłady poniżej – kursywą te, które firma/projekt dodaje sama.

```mermaid
stateDiagram-v2
    direction LR

    state "To Do" as todo {
        state "Do zrobienia (domyślny)" as todo_default
        state "Backlog" as backlog
    }
    state "In Progress" as in_progress {
        state "W trakcie (domyślny)" as doing
        state "In Development" as in_dev
        state "Frontend" as in_fe
        state "Backend" as in_be
        state "Testing" as testing
        state "Review" as review
    }
    state "Done" as done {
        state "Zakończone (domyślny)" as finished
        state "Po review" as reviewed
        state "Oddane klientowi" as delivered
    }
    state "Cancelled" as cancelled {
        state "Anulowane (domyślny)" as cancelled_default
        state "Przerwane do odwołania" as on_hold
        state "Odłożone na później" as postponed
    }

    [*] --> todo
    todo --> in_progress : rozpocznij
    in_progress --> todo : cofnij
    in_progress --> done : zakończ
    done --> in_progress : otwórz ponownie
    todo --> cancelled : anuluj
    in_progress --> cancelled : anuluj
    cancelled --> todo : przywróć
```

## Zasady

- Kategorie są 4 i są stałe (choices w kodzie), bo od nich zależą: postęp %, „zaległe”, KPI, raporty.
- Swoboda firm jest w podstatusach – dowolna liczba w każdej kategorii.
- `is_default` – jeden na (organizacja, projekt, applies_to, category); np. „rozpocznij” ustawia domyślny podstatus In Progress.
- Zadanie trzyma `status_id` i kopię `status_category` (złożony FK) – szczegóły w [schemat-v2.md](schemat-v2.md).
- Kanban: 4 kolumny (albo 3 + ukryte anulowane), w kolumnie sekcje według podstatusów.
