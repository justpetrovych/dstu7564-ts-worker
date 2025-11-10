# ДСТУ 7564 (Купина) - Спрощена C-реалізація для WebAssembly

Спрощена версія українського стандарту криптографічної хеш-функції ДСТУ 7564 (Купина), оптимізована для компіляції в WebAssembly.

## Структура проекту

```
native/
├── include/
│   └── kupyna.h           # Публічний API заголовок
├── src/
│   ├── kupyna.c           # Основна реалізація
│   └── kupyna_tables.c    # S-Box таблиці (2048 uint64_t значень)
├── build/                 # Скомпільовані файли
├── test_compile.c         # Базовий тест
└── test_multiple.c        # Розширені тести
```

## Основні компоненти

### 1. Криптографічні константи (kupyna.c)

- **MDS матриця** (64 байти) - для операції mix_columns
- **P константи** (14 раундів × 16 стовпців) - для P-трансформації
- **Q константи для 512-біт стану** (10 раундів × 8 стовпців) - для хешів ≤256 біт
- **Q константи для 1024-біт стану** (14 раундів × 16 стовпців) - для хешів >256 біт

### 2. S-Box таблиці (kupyna_tables.c)

- **subrowcol[8][256]** - попередньо обчислена таблиця для комбінованих операцій:
  - Substitution (заміна за S-Box)
  - Row shift (циклічний зсув рядків)
  - Column mix (змішування стовпців через MDS матрицю)

### 3. Публічний API (kupyna.h)

```c
// Створення та звільнення контексту
KupynaCtx* kupyna_alloc(void);
void kupyna_free(KupynaCtx* ctx);

// Інкрементальне хешування
int kupyna_init(KupynaCtx* ctx, size_t hash_len);   // hash_len: 32, 48, або 64 байти
int kupyna_update(KupynaCtx* ctx, const uint8_t* data, size_t len);
int kupyna_final(KupynaCtx* ctx, uint8_t* hash);

// One-shot хешування
int kupyna_hash(const uint8_t* data, size_t data_len, uint8_t* hash, size_t hash_len);
```

## Ключові зміни для WebAssembly

### Що видалено:
- ❌ Залежність від ByteArray (замінено на `uint8_t*` + `size_t`)
- ❌ Складна система обробки помилок (замінено на прості коди повернення)
- ❌ HMAC/KMAC режими
- ❌ Користувацькі S-Box таблиці
- ❌ Функція обчислення S-Box таблиць (використовується готова таблиця)

### Що збережено:
- ✅ Всі криптографічні константи
- ✅ Повна реалізація алгоритму хешування
- ✅ Підтримка 256/384/512-біт хешів
- ✅ P та Q трансформації
- ✅ Padding згідно стандарту
- ✅ Output трансформація

## Компіляція

### Нативна компіляція (GCC)

```bash
cd native

# Компіляція бібліотеки
gcc -Wall -Wextra -I. -c src/kupyna_tables.c -o build/kupyna_tables.o
gcc -Wall -Wextra -I. -c src/kupyna.c -o build/kupyna.o

# Компіляція та запуск тестів
gcc -Wall -Wextra -I. -c test_compile.c -o build/test_compile.o
gcc build/kupyna.o build/kupyna_tables.o build/test_compile.o -o build/test_kupyna
./build/test_kupyna

# Розширені тести
gcc -Wall -Wextra -I. -c test_multiple.c -o build/test_multiple.o
gcc build/kupyna.o build/kupyna_tables.o build/test_multiple.o -o build/test_multiple
./build/test_multiple
```

### Компіляція для WebAssembly (Emscripten)

```bash
# Базова компіляція
emcc src/kupyna.c src/kupyna_tables.c -I./include \
    -o kupyna.js \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='["_kupyna_alloc","_kupyna_init","_kupyna_update","_kupyna_final","_kupyna_free","_kupyna_hash","_malloc","_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["cwrap","setValue","getValue","UTF8ToString"]' \
    -s ALLOW_MEMORY_GROWTH=1

# Оптимізована компіляція
emcc src/kupyna.c src/kupyna_tables.c -I./include \
    -o kupyna.js \
    -O3 \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='["_kupyna_alloc","_kupyna_init","_kupyna_update","_kupyna_final","_kupyna_free","_kupyna_hash","_malloc","_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["cwrap","setValue","getValue","UTF8ToString"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='createKupynaModule'
```

## Приклад використання

### C код

```c
#include "kupyna.h"

int main() {
    uint8_t hash[32];
    const uint8_t* message = (const uint8_t*)"Hello, World!";

    // One-shot хешування
    kupyna_hash(message, 13, hash, 32);

    // Інкрементальне хешування
    KupynaCtx* ctx = kupyna_alloc();
    kupyna_init(ctx, 32);
    kupyna_update(ctx, message, 13);
    kupyna_final(ctx, hash);
    kupyna_free(ctx);

    return 0;
}
```

## Результати тестів

Тести підтверджують коректність реалізації:

- ✅ Порожній рядок хешується правильно
- ✅ Різні розміри хешів (256/384/512 біт) працюють
- ✅ Інкрементальне оновлення дає той самий результат, що й one-shot
- ✅ Довгі повідомлення та бінарні дані обробляються коректно

### Приклад виводу:

```
Hash ("Hello, World!" 256-bit): 3adab8ab5c58f9651ce7fb8e4d218dc8401ff01cdcb8c09b87540b8d96550aec
```

## Технічні деталі

### Розміри структур:
- `KupynaCtx`: ~18 KB (в основному S-Box таблиця)
- S-Box таблиця: 8 × 256 × 8 = 16 KB
- Стан (state): 64 або 128 байт (залежно від розміру хешу)

### Продуктивність:
- Використовує табличну реалізацію для швидкості
- Мінімальні виклики malloc (тільки для контексту)
- Підходить для WebAssembly завдяки відсутності зовнішніх залежностей

## Ліцензія

BSD License (як і оригінальна реалізація від PrivatBank IT)

Copyright (c) 2016 PrivatBank IT <acsk@privatbank.ua>

## Джерела

Базується на офіційній реалізації з репозиторію:
https://github.com/privat-it/cryptonite
