import Phaser from '../lib/phaser.js';
import Carrot from '../game/Carrot.js'

export default class Game extends Phaser.Scene {
    carrotsCollected = 0;
    /** @type {Phaser.Physics.Arcade.StaticGroup} */
    platforms
    /** @type {Phaser.Physics.Arcade.Sprite} */
    player
    /**  @type {Phaser.Types.Input.Keyboard.CursorKeys} */
    cursors
    /** @type {Phaser.Physics.Arcade.Group} */
    carrots
    /** @type {Phaser.GameObjects.Text} */
    carrotsCollectedText

    constructor() {
        // klucz, unikalny dla kazdej sceny
        super('game');
    }

    // init - glownie do inicjalizacji zmiennych
    init() {
        this.carrotsCollected = 0
    }

    preload() {
        // sciezka nie jest wzgledna do obecnego pliku, ale do tego jak widzi to serwer, 
        // czyli jest to sciezka wgledna to roota projektu
        this.load.image('background', 'assets/bg_layer1.png');
        this.load.image('platform', 'assets/ground_stone.png');
        this.load.image('bunny-stand', 'assets/flyMan_stand.png');
        this.load.image('carrot', 'assets/gold_1.png');

        this.load.audio('jump', 'assets/sfx/phaseJump1.ogg');

        // sterowanie - inicjalizacja
        this.cursors = this.input.keyboard.createCursorKeys();
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

        // wyloczenie kolizji w wyjątkiem dołu gracza
        this.player.body.checkCollision.up = false;
        this.player.body.checkCollision.left = false;
        this.player.body.checkCollision.right = false;

        // kamera sledzi playera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setDeadzone(this.scale.width * 1.5);

        // grupa marchewek
        this.carrots = this.physics.add.group({
            classType: Carrot
        });

        // kolizja platform i marchewek
        this.physics.add.collider(this.platforms, this.carrots);

        // logika zbierania (kolejnosc: obiekty, callback, kolejny callback, kontekst)
        this.physics.add.overlap(
            this.player,
            this.carrots,
            this.handleCollectCarrot, // called on overlap
            undefined,
            this
        );

        // tekst z wynikiem
        const style = { color: '#000', fontSize: 24 }
        this.carrotsCollectedText = this.add.text(240, 10, 'Carrots: 0'
            , style)
            .setScrollFactor(0)
            .setOrigin(0.5, 0);
    }

    update(t, dt) {

        // iteracja po wszystkich platformach z grupy,
        // i sprawdzenie czy wyszła poza ekran
        this.platforms.children.iterate(child => {
            /** @type {Phaser.Physics.Arcade.Sprite} */
            const platform = child;
            const scrollY = this.cameras.main.scrollY;
            if (platform.y >= scrollY + 700) {
                platform.y = scrollY - Phaser.Math.Between(50, 100);
                platform.body.updateFromGameObject();

                this.addCarrotAbove(platform);
            }
        })

        // sprawdzenie czy player dotyka platformy
        const touchingDown = this.player.body.touching.down;
        if (touchingDown) {
            // jesli tak, to skacz do góry
            this.player.setVelocityY(-300);
            this.sound.play('jump');
        }

        // starowanie w lewo i prawo podczas lotu
        if (this.cursors.left.isDown && !touchingDown) {
            this.player.setVelocityX(-200);
        }
        else if (this.cursors.right.isDown && !touchingDown) {
            this.player.setVelocityX(200);
        }
        else {
            this.player.setVelocityX(0);
        }

        // przechodzenie przez sciany
        this.horizontalWrap(this.player);

        // jesli zostanie przekroczona najnizsza platforma,
        // pokaz scene game-over
        const bottomPlatform = this.findBottomMostPlatform()
        if (this.player.y > bottomPlatform.y + 200) {
            this.scene.start('game-over');
        }
    }

    horizontalWrap(sprite) {
        const halfWidth = sprite.displayWidth * 0.5
        const gameWidth = this.scale.width
        if (sprite.x < -halfWidth) {
            sprite.x = gameWidth + halfWidth
        }
        else if (sprite.x > gameWidth + halfWidth) {
            sprite.x = -halfWidth
        }
    }

    /**
    * @param {Phaser.GameObjects.Sprite} sprite
    */
    addCarrotAbove(sprite) {
        const y = sprite.y - sprite.displayHeight
        /** @type {Phaser.Physics.Arcade.Sprite} */
        const carrot = this.carrots.get(sprite.x, y, 'carrot');

        // set active and visible
        carrot.setActive(true);
        carrot.setVisible(true);

        this.add.existing(carrot);

        // aktualizacja fizyki do rozmiaru ciała ktore bylo wczesniej przeskalowane
        carrot.body.setSize(carrot.width, carrot.height);

        // uaktywnienie fizyki
        this.physics.world.enable(carrot);
        return carrot;
    }

    /**
    * @param {Phaser.Physics.Arcade.Sprite} player
    * @param {Carrot} carrot
    */
    handleCollectCarrot(player, carrot) {
        // schowanie
        this.carrots.killAndHide(carrot);

        // deakctywacja fizyki
        this.physics.world.disableBody(carrot.body);

        this.carrotsCollected++;
        const value = `Coins: ${this.carrotsCollected}`;
        this.carrotsCollectedText.text = value;
    }

    // znajdywanie najnizszej platformy
    findBottomMostPlatform() {
        const platforms = this.platforms.getChildren()
        let bottomPlatform = platforms[0]
        for (let i = 1; i < platforms.length; ++i) {
            const platform = platforms[i]

            if (platform.y < bottomPlatform.y) {
                continue
            }

            bottomPlatform = platform
        }

        return bottomPlatform
    }
}