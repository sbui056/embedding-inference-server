import pytest
from pydantic import ValidationError

from server.config import Settings


class TestConfigValidation:
    def test_valid_defaults(self):
        s = Settings()
        assert s.port == 8000
        assert s.batch_wait_ms == 10.0
        assert s.max_batch_texts == 128

    def test_invalid_port_zero(self):
        with pytest.raises(ValidationError, match="Port must be between"):
            Settings(port=0)

    def test_invalid_port_too_high(self):
        with pytest.raises(ValidationError, match="Port must be between"):
            Settings(port=70000)

    def test_valid_port_range(self):
        s = Settings(port=3000)
        assert s.port == 3000

    def test_negative_batch_max_size(self):
        with pytest.raises(ValidationError, match="must be positive"):
            Settings(batch_max_size=-1)

    def test_zero_max_text_length(self):
        with pytest.raises(ValidationError, match="must be positive"):
            Settings(max_text_length=0)

    def test_negative_batch_wait_ms(self):
        with pytest.raises(ValidationError, match="must be positive"):
            Settings(batch_wait_ms=-5.0)

    def test_invalid_log_level(self):
        with pytest.raises(ValidationError, match="Invalid log level"):
            Settings(log_level="verbose")

    def test_valid_log_levels(self):
        for level in ("debug", "info", "warning", "error", "critical"):
            s = Settings(log_level=level)
            assert s.log_level == level

    def test_cors_origin_list_parsing(self):
        s = Settings(cors_origins="http://localhost:3000, http://example.com")
        assert s.cors_origin_list == ["http://localhost:3000", "http://example.com"]
