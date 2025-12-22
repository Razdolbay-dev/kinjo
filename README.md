Создание базы данных и пользователей MySQL

1.1. Создать базу данных
```sql
CREATE DATABASE veoveo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

1.2. Создать пользователей

Пользователь api (не используется в проекте, но создаём согласно требованиям)
```sql
CREATE USER 'api'@'127.0.0.1' IDENTIFIED BY '<random-api-password>';
```

Пользователь veodb (будет использовать backend)
```sql
CREATE USER 'veodb'@'127.0.0.1' IDENTIFIED BY '<random-veodb-password>';
```
1.3. Выдать права пользователям

Права только на одну БД veoveo_db.

api
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON veoveo_db.* TO 'api'@'127.0.0.1';
```
veodb
```sql
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP ON veoveo_db.* TO 'veodb'@'127.0.0.1';
```
1.4. Применяем изменения
```sql
FLUSH PRIVILEGES;
```

Готово.

1. Основная сущность: contents
```sql
CREATE TABLE contents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255) NOT NULL,
    poster_url VARCHAR(500) NOT NULL,
    duration INT NOT NULL,
    description TEXT,
    year INT NOT NULL,
    end_year INT,
    kinopoisk_id INT,
    imdb_id VARCHAR(50),
    content_type_id INT NOT NULL,
    age_restriction VARCHAR(20),
    cast TEXT,
    directors TEXT,
    screenwriters TEXT,
    producers TEXT,
    operators TEXT,
    composers TEXT,
    artists TEXT,
    editors TEXT,
    voice_authors TEXT, -- deprecated
    audio_tracks TEXT,
    video_quality VARCHAR(50),
    seasons_count INT,
    episodes_count INT,
    created_at DATETIME,
    updated_at DATETIME,
    premiere_at DATETIME,
    last_season_premiere_at DATETIME,
    exclusive_start_at DATETIME,
    exclusive_end_at DATETIME,
    is_lgbt BOOLEAN DEFAULT FALSE,
    player_url VARCHAR(500),

    FOREIGN KEY (content_type_id) REFERENCES content_types(id)
);
```

2. Таблица типов контента: content_types
```sql
CREATE TABLE content_types (
    id INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE
);
```

3. Голосовые актёры (новый формат): voice_authors
```sql
CREATE TABLE voice_authors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL
);

```
   Связь контент ↔ voice authors (многие-ко-многим):

```sql
CREATE TABLE content_voice_authors (
    content_id INT NOT NULL,
    voice_author_id INT NOT NULL,
    PRIMARY KEY (content_id, voice_author_id),

    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (voice_author_id) REFERENCES voice_authors(id) ON DELETE CASCADE
);
```
4. Рейтинги: ratings
```sql
CREATE TABLE ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content_id INT NOT NULL,
    source VARCHAR(50) NOT NULL, -- imdb, kp, tmdb, etc.
    rating FLOAT NOT NULL,
    votes INT,
    
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);
```

5. Жанры: genres и связь многие-ко-многим

```sql
CREATE TABLE genres (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE content_genres (
    content_id INT NOT NULL,
    genre_id INT NOT NULL,
    PRIMARY KEY (content_id, genre_id),

    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);
```

6. Страны

```sql
CREATE TABLE countries (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE content_countries (
    content_id INT NOT NULL,
    country_id INT NOT NULL,
    PRIMARY KEY (content_id, country_id),

    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE
);
```

7. Языки

```sql
CREATE TABLE languages (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE content_languages (
    content_id INT NOT NULL,
    language_id INT NOT NULL,
    PRIMARY KEY (content_id, language_id),

    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
);
```

8. Субтитры

```sql
CREATE TABLE subtitles (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE content_subtitles (
    content_id INT NOT NULL,
    subtitle_id INT NOT NULL,
    PRIMARY KEY (content_id, subtitle_id),

    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (subtitle_id) REFERENCES subtitles(id) ON DELETE CASCADE
);
```

9. Количество эпизодов по сезонам (episodesBySeason)

```sql
CREATE TABLE content_seasons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content_id INT NOT NULL,
    season_ordering INT NOT NULL,
    episodes_count INT NOT NULL,

    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);
```

10. Связь “эпизоды/сезоны по авторам озвучки”
    Авторы → сезоны

```sql
CREATE TABLE content_voice_author_seasons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content_id INT NOT NULL,
    voice_author_id INT NOT NULL,
    season_ordering INT NOT NULL,

    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (voice_author_id) REFERENCES voice_authors(id) ON DELETE CASCADE
);
```

Эпизоды

```sql
CREATE TABLE content_voice_author_episodes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vas_id INT NOT NULL,
    episode_number INT NOT NULL,

    FOREIGN KEY (vas_id) REFERENCES content_voice_author_seasons(id) ON DELETE CASCADE
);
```