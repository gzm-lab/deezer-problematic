"""Gestion de l'authentification OAuth Deezer."""

import os
import json
import time
import threading
import webbrowser
import http.server
import socketserver
import urllib.parse as urlparse
import requests
from pathlib import Path
from dotenv import load_dotenv


load_dotenv()

CACHE_FILE = ".deezer_token.json"


class OAuthHandler(http.server.BaseHTTPRequestHandler):
    """Gestionnaire HTTP pour les callbacks OAuth."""
    
    server_version = "DeezerOAuth/0.1"

    def do_GET(self):
        parsed = urlparse.urlparse(self.path)
        qs = urlparse.parse_qs(parsed.query)
        if "code" in qs:
            code = qs["code"][0]
            self.server.code = code
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"<html><body><h2>Autorisation reussie. Vous pouvez fermer cette fenetre.</h2></body></html>")
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Missing code parameter")

    def log_message(self, format, *args):
        return


class DeezerOAuth:
    """Gestionnaire d'authentification OAuth pour Deezer."""
    
    def __init__(self, app_id=None, secret=None, application_domain=None, cache_file=CACHE_FILE):
        self.app_id = app_id or os.getenv("application_id")
        self.secret = secret or os.getenv("secret_key")
        self.application_domain = application_domain or os.getenv("application_domain")
        self.cache_file = cache_file
    
    def start_local_server(self, host, port):
        """Démarre un serveur HTTP local pour les callbacks OAuth."""
        class _Server(socketserver.TCPServer):
            allow_reuse_address = True

        handler = OAuthHandler
        httpd = _Server((host, port), handler)
        httpd.code = None
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        return httpd
    
    def build_auth_url(self, redirect_uri, perms=None):
        """Construit l'URL d'autorisation Deezer."""
        base = "https://connect.deezer.com/oauth/auth.php"
        params = {
            "app_id": self.app_id,
            "redirect_uri": redirect_uri,
        }
        if perms:
            params["perms"] = perms
        return base + "?" + urlparse.urlencode(params)
    
    def exchange_code_for_token(self, code):
        """Échange le code d'autorisation contre un access token."""
        url = "https://connect.deezer.com/oauth/access_token.php"
        params = {
            "app_id": self.app_id,
            "secret": self.secret,
            "code": code,
            "output": "json",
        }
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    
    def load_cached_token(self):
        """Charge le token en cache s'il existe."""
        try:
            with open(self.cache_file, "r", encoding="utf-8") as f:
                token = json.load(f)
            if isinstance(token, dict) and "retrieved_at" not in token:
                try:
                    token["retrieved_at"] = int(os.path.getmtime(self.cache_file))
                except Exception:
                    token["retrieved_at"] = int(time.time())
            return token
        except Exception:
            return None
    
    def token_is_valid(self, token_obj):
        """Vérifie si un token est valide et n'a pas expiré."""
        if not token_obj:
            return False
        access = token_obj.get("access_token")
        if not access:
            return False
        expires = token_obj.get("expires")
        retrieved = token_obj.get("retrieved_at")
        try:
            expires_int = int(expires) if expires is not None else 0
        except Exception:
            expires_int = 0
        if expires_int == 0:
            return True
        if not retrieved:
            return False
        elapsed = int(time.time()) - int(retrieved)
        return elapsed < (expires_int - 60)
    
    def save_token(self, token_obj):
        """Sauvegarde le token en cache."""
        if isinstance(token_obj, dict) and "retrieved_at" not in token_obj:
            token_obj["retrieved_at"] = int(time.time())
        with open(self.cache_file, "w", encoding="utf-8") as f:
            json.dump(token_obj, f)
    
    def get_access_token(self, force_auth=False, no_open=False, no_save=False):
        """Obtient un access token, via cache, env var ou OAuth flow.
        
        Args:
            force_auth: Force une nouvelle authentification
            no_open: Ne pas ouvrir le navigateur automatiquement
            no_save: Ne pas sauvegarder le token
        
        Returns:
            Access token string
        
        Raises:
            ValueError: Si les identifiants OAuth ne sont pas configurés
            TimeoutError: Si le timeout OAuth est dépassé
        """
        if not self.app_id or not self.secret or not self.application_domain:
            raise ValueError(
                "OAuth non configuré. Veuillez définir application_id, secret_key "
                "et application_domain dans votre fichier .env"
            )
        
        # Essayer d'abord l'env var
        env_token = os.getenv("DEEZER_ACCESS_TOKEN")
        if env_token:
            return env_token
        
        # Puis le token en cache s'il est valide
        cached = self.load_cached_token()
        if (not force_auth) and cached and self.token_is_valid(cached):
            return cached.get("access_token")
        
        # Sinon, faire le flow OAuth
        parsed = urlparse.urlparse(self.application_domain)
        host = parsed.hostname or "localhost"
        port = parsed.port or 8080
        path = parsed.path or "/"

        httpd = self.start_local_server(host, port)
        redirect_uri = f"{parsed.scheme}://{host}:{port}{path}" if parsed.scheme else f"http://{host}:{port}{path}"

        perms = "basic_access,manage_library,delete_library,offline_access"
        auth_url = self.build_auth_url(redirect_uri, perms=perms)

        print("Ouvrir la page d'autorisation Deezer...")
        if not no_open:
            try:
                webbrowser.open(auth_url)
            except Exception:
                print("Impossible d'ouvrir le navigateur automatiquement. Ouvrez manuellement:")
                print(auth_url)
        else:
            print("Ouvrez manuellement dans votre navigateur:")
            print(auth_url)

        print("En attente du code d'autorisation...")
        waited = 0
        while getattr(httpd, "code", None) is None and waited < 300:
            time.sleep(0.5)
            waited += 0.5

        code = getattr(httpd, "code", None)
        httpd.shutdown()
        if not code:
            raise TimeoutError(
                "Timeout: aucun code reçu. Vérifiez que votre `application_domain` "
                "est accessible et correct."
            )

        token_json = self.exchange_code_for_token(code)
        access_token = token_json.get("access_token")
        if not access_token:
            raise ValueError(f"Erreur lors de la récupération de l'access token: {token_json}")
        
        expires = token_json.get("expires")
        print(f"Token reçu (expires={expires})")
        
        if not no_save:
            try:
                self.save_token(token_json)
                print(f"Access token sauvegardé dans {self.cache_file}")
            except Exception as e:
                print(f"Impossible de sauvegarder le token: {e}")
        
        return access_token
