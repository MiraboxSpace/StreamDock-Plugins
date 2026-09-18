import streamDeck from "@elgato/streamdeck";
import { DoNotDisturbAction } from "./actions/do-not-disturb";

streamDeck.actions.registerAction(new DoNotDisturbAction());

streamDeck.connect();