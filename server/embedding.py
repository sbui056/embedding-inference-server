import logging

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.model: SentenceTransformer | None = None
        self.embedding_dim: int | None = None

    def load_model(self) -> None:
        logger.info("Loading model: %s", self.model_name)
        try:
            self.model = SentenceTransformer(self.model_name)
            warmup = self.model.encode(
                ["warmup"], normalize_embeddings=True, show_progress_bar=False
            )
            self.embedding_dim = warmup.shape[1]
        except Exception as e:
            raise RuntimeError(f"Failed to load model '{self.model_name}': {e}") from e
        logger.info("Model loaded. Embedding dim: %d", self.embedding_dim)

    def encode(self, texts: list[str]) -> np.ndarray:
        return self.model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
