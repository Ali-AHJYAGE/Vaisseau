# Assets — remplace le rendu par code par tes propres fichiers

Dépose un fichier au bon nom dans ce dossier : il **remplace automatiquement**
le rendu généré par le jeu (aucun code à toucher). Envoie-les moi et je les
commit, ou ajoute-les toi-même et pousse sur GitHub (Render redéploie seul).

## Images (PNG transparent conseillé)
> Rôles : **`innocent` = la SOURIS 🐭**, **`imposteur` = le CHAT 🐱** (noms de fichiers inchangés).

| Fichier              | Rôle                                   | Taille conseillée |
|----------------------|----------------------------------------|-------------------|
| `innocent.png`       | Sprite de la SOURIS (vue du dessus)    | ~128×128          |
| `imposteur.png`      | Sprite du CHAT                         | ~128×128          |
| `innocent_dead.png`  | Innocent mort (optionnel)              | ~128×128          |
| `imposteur_dead.png` | Imposteur mort (optionnel)             | ~128×128          |
| `space.png`          | Fond spatial (remplace les étoiles)    | 760×560           |

### Animation de marche (optionnel)
| Fichier              | Format                                                        |
|----------------------|---------------------------------------------------------------|
| `innocent_walk.png`  | Bande HORIZONTALE de frames **carrées** côte à côte (ex: 4 frames de 128×128 → image 512×128). Jouée quand le perso bouge, frame 0 à l'arrêt. |
| `imposteur_walk.png` | Idem pour l'imposteur                                          |

Si `*_walk.png` est présent → vraie animation. Sinon, un simple `innocent.png`
est **déjà animé** par code (rebond + squash & stretch + balancement).
| `task.png` `vent.png` `teleport.png` `weapon.png` `gadget.png` `o2.png` `heal.png` | icônes d'éléments (optionnel) | ~48×48 |

## Audio
| Fichier      | Rôle                                             |
|--------------|--------------------------------------------------|
| `music.mp3`  | Musique de fond, **en boucle** (< ~4 Mo)         |

⚠️ Sur l'URL publique : n'utilise que de la musique **libre de droits** ou tes
propres créations (sinon risque de retrait).

Les bruitages (coups, tâches, sabotages, victoire…) sont **synthétisés en direct**
par `js/audio.js` — pas besoin de fichiers.
