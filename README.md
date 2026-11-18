# PN532 NFC – MakeCode micro:bit
![Czerwona płytka PN532 V3](czerwona%20p%C5%82ytka%20PN532.jpg)

Biblioteka do obsługi czytnika RFID/NFC PN532 przez I2C
z wykorzystaniem BBC micro:bit V2.

Biblioteka przeznaczona jest do obsługi kart
MIFARE Classic 1K.

## Obsługiwane funkcje

- Inicjalizacja czytnika PN532
- Wykrywanie kart MIFARE Classic 1K
- Odczyt UID karty
- Odczyt tekstu z pamięci karty
- Zapis tekstu do pamięci karty
- Diagnostyka błędów

## Podłączenie PN532 do micro:bit

Czytnik PN532 musi pracować w trybie I2C.

| PN532 | micro:bit |
|------|-----------|
| VCC | 3.3V |
| GND | GND |
| SDA | P20 |
| SCL | P19 |

Adres I2C czytnika: `0x24`.

Uwaga: przed podłączeniem sprawdź wymagania
zasilania i poziomy logiczne swojej wersji PN532.
Nie podawaj sygnałów 5 V bezpośrednio na micro:bit.

## Bloki MakeCode

### Podstawowe

**inicjalizuj PN532**

Uruchamia czytnik PN532.

Zwraca:
- true – inicjalizacja poprawna
- false – błąd inicjalizacji

**wykryj kartę**

Sprawdza obecność obsługiwanej karty.

Zwraca:
- true – wykryto kartę MIFARE Classic 1K
- false – nie wykryto obsługiwanej karty

**UID karty**

Zwraca UID ostatnio wykrytej karty
w postaci tekstu HEX.

Przykład: `B4801B06`

### Pamięć karty

**odczytaj tekst**

Odczytuje tekst z bloku 4 pamięci karty.

Maksymalnie 16 bajtów.

**zapisz tekst**

Zapisuje tekst do bloku 4 pamięci karty.

Maksymalnie 16 znaków ASCII.

Zwraca:
- true – zapis poprawny
- false – błąd zapisu

Uwaga: zapis nadpisuje dotychczasową
zawartość całego bloku 4.

### Diagnostyka

**ostatni błąd**

Zwraca tekst ostatniego błędu.

Przykłady:
- BRAK KARTY
- TIMEOUT
- BLAD I2C
- BLAD AUTORYZACJI
- TO NIE CLASSIC 1K

## Uwierzytelnianie

Biblioteka wykorzystuje domyślny klucz A:

`FF FF FF FF FF FF`

Odczyt i zapis dotyczą wyłącznie bloku 4.

Karty ze zmienionym kluczem mogą nie działać.

## Ograniczenia

- Obsługa typowych kart MIFARE Classic 1K
  z 4-bajtowym UID
- Komunikacja PN532 przez I2C
- Odczyt i zapis wyłącznie bloku 4
- Maksymalnie 16 znaków ASCII przy zapisie
- Brak obsługi innych typów kart NFC

Rozpoznawanie typu karty odbywa się na podstawie
parametrów ATQA i SAK i nie stanowi
kryptograficznego potwierdzenia jej typu.

## Instalacja w MakeCode

1. Otwórz https://makecode.microbit.org
2. Utwórz nowy projekt.
3. Wybierz Rozszerzenia.
4. Wyszukaj repozytorium:

   https://github.com/pawelkasprowicz/pxt-pn532-i2c

5. Dodaj bibliotekę do projektu.

## Autor

Paweł Kasprowicz

GitHub: https://github.com/pawelkasprowicz
