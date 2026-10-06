import Phaser from 'phaser';

class EventBusClass extends Phaser.Events.EventEmitter {}

export const EventBus = new EventBusClass();