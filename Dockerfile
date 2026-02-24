FROM python:3.12-slim

WORKDIR /app

COPY arb-scanner/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY arb-scanner/backend/app/ ./app/
COPY arb-scanner/backend/start.sh /start.sh
RUN chmod +x /start.sh

RUN mkdir -p /data

EXPOSE 8000

CMD ["bash", "/start.sh"]
