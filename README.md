# SecureShare

Projet SecureShare — génération + partage de mot de passe via lien éphémère.

## Principes de sécurité
- Le mot de passe est **chiffré côté client** (AES-GCM 256) — le backend ne reçoit jamais le secret en clair.
- La clé de déchiffrement est placée **dans le fragment (#)** de l'URL : le navigateur ne l'envoie **pas** au serveur.
- Aucune donnée persistante : tout est stocké **en mémoire** et expiré automatiquement.
- Rate limiting (30 req/min/IP).

## Déploiement (rappel)
1. Construire et déployer via Portainer sur ZimaOS (utilise docker-compose.yml)
2. Dans Nginx Proxy Manager, créer un Proxy Host:
   - Domaine : `secureshare.vsalome.fr`
   - Forward to : `http://<machine>:8080` (ou `secureshare-frontend:80` si NPM sur même docker network)
   - SSL : Let's Encrypt
3. DNS : sur Cloudflare, créer un enregistrement A pour `secureshare.vsalome.fr` pointant sur l'IP publique de ton homelab et activer le Proxy (icône orange).

## Notes opérationnelles
- Backend écoute sur le réseau interne 3001, il n'est pas exposé publiquement dans le compose (accessible via Docker network depuis le frontend).
- Nginx Proxy Manager termine TLS (HTTPS). Le frontend communique en HTTP interne vers backend (conforme à ta demande).

## RGPD
- Aucune conservation persistante des secrets.
- Les données sensibles ne sont jamais reçues en clair par le serveur.
