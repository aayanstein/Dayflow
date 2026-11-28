FROM gcc:13-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake \
    make \
    libcurl4-openssl-dev \
    libsqlite3-dev \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY . .

RUN cmake -B build && cmake --build build -j2

EXPOSE 18080
CMD ["./build/dayflow"]