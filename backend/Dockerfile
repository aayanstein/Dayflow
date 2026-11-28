FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libsqlite3-dev \
    libasio-dev \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/CrowCpp/Crow/releases/download/v1.2.0/crow_all.h -o /usr/local/include/crow.h

WORKDIR /app/backend

COPY . .

RUN cmake -B build && cmake --build build -j2

EXPOSE 18080

CMD ["./build/dayflow"]