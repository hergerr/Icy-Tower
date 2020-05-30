import Phaser from '../lib/phaser.js';

export default class Game extends Phaser.Scene {

    /** @type {Phaser.Physics.Arcade.StaticGroup} */
    platforms
    /** @type {Phaser.Physics.Arcade.Sprite} */
    player

    constructor() {
        // klucz, unikalny dla kazdej sceny
        super('game');
    }
    preload() {
        // sciezka nie jest wzgledna do obecnego pliku, ale do tego jak widzi to serwer, 
        // czyli jest to sciezka wgledna to roota projektu
        this.load.image('background', 'assets/bg_layer1.png');
        this.load.image('platform', 'assets/ground_grass.png');
        this.load.image('bunny-stand', 'assets/bunny1_stand.png');
    }

    create() {
        // wspolrzedne srodka obrazka, ustawienie 
        // tla nieruchomo w plaszyznie y (patrz docs'y)
        this.add.image(240, 320, 'background').setScrollFactor(1, 0);

        // platformy - zmienna klasy
        this.platforms = this.physics.add.staticGroup()
        for (let i = 0; i < 5; ++i) {
            const x = Phaser.Math.Between(80, 400)
            const y = 150 * i
            /** @type {Phaser.Physics.Arcade.Sprite} */
            const platform = this.platforms.create(x, y, 'platform')
            platform.scale = 0.5
            /** @type {Phaser.Physics.Arcade.StaticBody} */
            const body = platform.body
            body.updateFromGameObject()
        }

        // gracz jako wlasnosc klasy
        this.player = this.physics.add.sprite(240, 320, 'bunny-stand').setScale(0.5);

        // kolizja
        this.physics.add.collider(this.platforms, this.player);

        // wyloczenie kolizji w wyjątkiem góry platformy
        this.player.body.checkCollision.up = false;
        this.player.body.checkCollision.left = false;
        this.player.body.checkCollision.right = false;

        // kamera sledzi playera
        this.cameras.main.startFollow(this.player)
    }

    update() {

        // iteracja po wszystkich platformach z grupy,
        // i sprawdzenie czy wyszła poza ekran
        // TODO sprawdzic wsporzedne
        this.platforms.children.iterate(child => {
            /** @type {Phaser.Physics.Arcade.Sprite} */
            const platform = child
            const scrollY = this.cameras.main.scrollY
            if (platform.y >= scrollY + 700) {
                platform.y = scrollY - Phaser.Math.Between(50, 100)
                platform.body.updateFromGameObject()
            }
        })

        // sprawdzenie czy player dotyka platformy
        const touchingDown = this.player.body.touching.down
        if (touchingDown) {
            // jesli tak, to skacz do góry
            this.player.setVelocityY(-300)
        }
    }
}