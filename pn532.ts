//% color=#00897B icon="\uf2c2" block="PN532 NFC"
namespace PN532 {

    const ADDRESS = 0x24

    let initialized = false
    let cardPresent = false
    let cardUID = ""
    let errorText = ""
    let uidBytes: number[] = []

    function emptyBuffer(): Buffer {
        return pins.createBuffer(0)
    }

    function hexByte(value: number): string {
        let h = "0123456789ABCDEF"
        return h.charAt((value >> 4) & 15) +
            h.charAt(value & 15)
    }

    function clearCard() {
        cardPresent = false
        cardUID = ""
        uidBytes = []
    }

    function sendCommand(data: number[]): boolean {

        let len = data.length + 1
        let sum = 0xD4

        for (let i = 0; i < data.length; i++) {
            sum += data[i]
        }

        let frame = pins.createBuffer(data.length + 8)

        frame[0] = 0x00
        frame[1] = 0x00
        frame[2] = 0xFF
        frame[3] = len
        frame[4] = (256 - len) & 255
        frame[5] = 0xD4

        for (let i = 0; i < data.length; i++) {
            frame[6 + i] = data[i]
        }

        frame[6 + data.length] =
            (256 - (sum & 255)) & 255

        frame[7 + data.length] = 0x00

        let result = pins.i2cWriteBuffer(
            ADDRESS, frame, false
        )

        if (result != 0) {
            errorText = "BLAD I2C"
            return false
        }

        return true
    }

    function waitReady(timeout: number): boolean {

        let start = input.runningTime()

        while (input.runningTime() - start < timeout) {

            let status = pins.i2cReadBuffer(
                ADDRESS, 1, false
            )

            if (status.length == 1 &&
                status[0] == 0x01) {
                return true
            }

            basic.pause(20)
        }

        return false
    }

    function readRaw(size: number, timeout: number): Buffer {

        if (!waitReady(timeout)) {
            errorText = "TIMEOUT"
            return emptyBuffer()
        }

        let raw = pins.i2cReadBuffer(
            ADDRESS, size, false
        )

        if (raw.length != size ||
            raw[0] != 0x01) {

            errorText = "BLAD ODCZYTU I2C"
            return emptyBuffer()
        }

        return raw
    }

    function command(data: number[], timeout: number): Buffer {

        errorText = ""

        if (!sendCommand(data)) {
            return emptyBuffer()
        }

        let ack = readRaw(7, 1000)

        if (ack.length != 7) {
            return emptyBuffer()
        }

        if (ack[1] != 0x00 ||
            ack[2] != 0x00 ||
            ack[3] != 0xFF ||
            ack[4] != 0x00 ||
            ack[5] != 0xFF ||
            ack[6] != 0x00) {

            errorText = "BRAK ACK"
            return emptyBuffer()
        }

        let raw = readRaw(64, timeout)

        if (raw.length != 64) {
            return emptyBuffer()
        }

        if (raw[1] != 0x00 ||
            raw[2] != 0x00 ||
            raw[3] != 0xFF) {

            errorText = "BLAD RAMKI"
            return emptyBuffer()
        }

        let len = raw[4]

        if (((len + raw[5]) & 255) != 0 ||
            len < 2 ||
            len + 8 > raw.length) {

            errorText = "BLAD DLUGOSCI"
            return emptyBuffer()
        }

        let sum = 0

        for (let i = 0; i < len; i++) {
            sum += raw[6 + i]
        }

        if (((sum + raw[6 + len]) & 255) != 0) {
            errorText = "BLAD SUMY"
            return emptyBuffer()
        }

        if (raw[6] != 0xD5 ||
            raw[7] != data[0] + 1) {

            errorText = "ZLA ODPOWIEDZ"
            return emptyBuffer()
        }

        let result = pins.createBuffer(len)

        for (let i = 0; i < len; i++) {
            result[i] = raw[6 + i]
        }

        return result
    }

    function exchange(data: number[]): Buffer {

        let cmd: number[] = [0x40, 0x01]

        for (let i = 0; i < data.length; i++) {
            cmd.push(data[i])
        }

        let r = command(cmd, 1500)

        if (r.length < 3) {
            return emptyBuffer()
        }

        if (r[0] != 0xD5 ||
            r[1] != 0x41) {

            errorText = "BLAD WYMIANY"
            return emptyBuffer()
        }

        if (r[2] != 0x00) {
            errorText = "BLAD KARTY: " +
                hexByte(r[2])
            return emptyBuffer()
        }

        return r
    }

    //% block="inicjalizuj PN532"
    //% group="Podstawowe"
    export function init(): boolean {

        initialized = false
        clearCard()
        errorText = ""

        let r = command(
            [0x14, 0x01, 0x14, 0x01],
            1000
        )

        if (r.length < 2) {
            return false
        }

        initialized = true
        return true
    }

    function detectOnce(): boolean {

        clearCard()

        let r = command(
            [0x4A, 0x01, 0x00],
            2500
        )

        if (r.length < 3) {
            return false
        }

        if (r[2] == 0) {
            errorText = "BRAK KARTY"
            return false
        }

        if (r.length < 12) {
            errorText = "NIEPELNE DANE"
            return false
        }

        let uidLen = r[7]

        if (uidLen != 4 ||
            r.length < 8 + uidLen) {

            errorText = "NIEOBSLUGIWANA KARTA"
            return false
        }

        let atqa = hexByte(r[4]) + hexByte(r[5])
        let sak = r[6]

        if (atqa != "0004" || sak != 0x08) {
            errorText = "TO NIE CLASSIC 1K"
            return false
        }

        for (let i = 0; i < 4; i++) {
            let b = r[8 + i]
            uidBytes.push(b)
            cardUID += hexByte(b)
        }

        cardPresent = true
        return true
    }

    //% block="wykryj karte"
    //% group="Podstawowe"
    export function detect(): boolean {

        if (!initialized) {
            errorText = "BRAK INICJALIZACJI"
            return false
        }

        for (let attempt = 0; attempt < 2; attempt++) {

            if (detectOnce()) {
                return true
            }

            if (errorText == "BRAK KARTY" ||
                errorText == "TO NIE CLASSIC 1K" ||
                errorText == "NIEOBSLUGIWANA KARTA") {
                return false
            }

            basic.pause(100)
        }

        return false
    }

    //% block="UID karty"
    //% group="Podstawowe"
    export function uid(): string {
        return cardUID
    }

    function authenticateBlock4(): boolean {

        if (!cardPresent ||
            uidBytes.length != 4) {

            errorText = "BRAK KARTY"
            return false
        }

        let data: number[] = [
            0x60,
            0x04,
            0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF
        ]

        for (let i = 0; i < 4; i++) {
            data.push(uidBytes[i])
        }

        let r = exchange(data)

        if (r.length < 3) {
            if (errorText == "") {
                errorText = "BLAD AUTORYZACJI"
            }
            return false
        }

        return true
    }

    //% block="odczytaj tekst"
    //% group="Pamiec karty"
    export function readText(): string {

        errorText = ""

        if (!authenticateBlock4()) {
            return ""
        }

        let r = exchange([0x30, 0x04])

        if (r.length < 19) {
            if (errorText == "") {
                errorText = "BLAD ODCZYTU"
            }
            return ""
        }

        let result = ""

        for (let i = 0; i < 16; i++) {

            let b = r[3 + i]

            if (b == 0) {
                break
            }

            result += String.fromCharCode(b)
        }

        return result
    }

    //% block="zapisz tekst %tekst"
    //% group="Pamiec karty"
    export function writeText(tekst: string): boolean {

        errorText = ""

        if (tekst.length > 16) {
            errorText = "TEKST ZA DLUGI"
            return false
        }

        for (let i = 0; i < tekst.length; i++) {

            let code = tekst.charCodeAt(i)

            if (code < 32 || code > 126) {
                errorText = "TYLKO ASCII"
                return false
            }
        }

        if (!authenticateBlock4()) {
            return false
        }

        let data: number[] = [0xA0, 0x04]

        for (let i = 0; i < 16; i++) {

            if (i < tekst.length) {
                data.push(tekst.charCodeAt(i))
            } else {
                data.push(0)
            }
        }

        let r = exchange(data)

        if (r.length < 3) {
            if (errorText == "") {
                errorText = "BLAD ZAPISU"
            }
            return false
        }

        return true
    }

    //% block="ostatni blad"
    //% group="Diagnostyka"
    export function lastError(): string {
        return errorText
    }
}