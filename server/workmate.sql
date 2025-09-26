-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- 主機： 127.0.0.1
-- 產生時間： 2025 年 09 月 17 日 18:17
-- 伺服器版本： 10.4.32-MariaDB
-- PHP 版本： 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 資料庫： `workmate`
--

-- --------------------------------------------------------

--
-- 資料表結構 `course_progress`
--

CREATE TABLE `course_progress` (
  `id` int(11) NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `course_id` int(11) NOT NULL,
  `watched_time` decimal(10,2) DEFAULT 0.00,
  `video_duration` decimal(10,2) DEFAULT 0.00,
  `progress_percentage` int(11) DEFAULT 0,
  `is_completed` tinyint(1) DEFAULT 0,
  `last_watched_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- 傾印資料表的資料 `course_progress`
--

INSERT INTO `course_progress` (`id`, `user_id`, `course_id`, `watched_time`, `video_duration`, `progress_percentage`, `is_completed`, `last_watched_at`, `created_at`) VALUES
(1, 2, 1, 16.01, 595.87, 3, 0, '2025-09-16 13:50:46', '2025-09-16 13:40:57'),
(90, 2, 2, 2.63, 595.87, 0, 0, '2025-09-16 13:50:06', '2025-09-16 13:50:00');

-- --------------------------------------------------------

--
-- 資料表結構 `posts`
--

CREATE TABLE `posts` (
  `id` int(11) NOT NULL,
  `author_id` int(10) UNSIGNED NOT NULL,
  `content` text NOT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- 傾印資料表的資料 `posts`
--

INSERT INTO `posts` (`id`, `author_id`, `content`, `image_url`, `created_at`, `updated_at`) VALUES
(1, 3, '這是一個測試貼文', NULL, '2025-09-16 06:28:23', '2025-09-16 06:28:23'),
(2, 2, '前端測試貼文', NULL, '2025-09-16 06:31:03', '2025-09-16 06:31:03'),
(3, 2, '123123123', NULL, '2025-09-16 06:35:20', '2025-09-16 06:35:20'),
(4, 2, 'test12333333', NULL, '2025-09-16 06:37:08', '2025-09-16 06:37:08');

-- --------------------------------------------------------

--
-- 資料表結構 `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'Member',
  `dept` varchar(100) NOT NULL DEFAULT 'General',
  `avatar_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `dept`, `avatar_url`, `created_at`, `updated_at`) VALUES
(1, 'Alice', 'alice@example.com', '$2b$10$LP6KqocB3qsDXtpLxEz7hOa32oo/j2qau9mdAqgF.qODwj4LXhOqC', 'Member', 'General', NULL, '2025-09-16 05:56:21', '2025-09-16 05:56:21'),
(2, 'test', '123@gmail.com', '$2b$10$4fgYvRpVPLq8zytCExJDHuZdBiiSW4USvUO/fH7j.I5Ij3N2gNmdC', 'Member', 'General', NULL, '2025-09-16 05:59:14', '2025-09-16 05:59:14'),
(3, '測試用戶', 'test@example.com', '$2b$10$3jwG21kPSb2DtVa5GyHUOePSSuwIVNnizx4gDRJm3avME8QNhIWYS', 'Member', 'General', NULL, '2025-09-16 06:28:14', '2025-09-16 06:28:14'),
(4, 'test123', '1234@gmail.com', '$2b$10$Bx5sPZlf7rny37ydccB0q.uaVKy9rtuLCg7M6CrDr.fHXnHHmmECS', 'Member', 'General', NULL, '2025-09-16 06:36:55', '2025-09-16 06:36:55');

--
-- 已傾印資料表的索引
--

--
-- 資料表索引 `course_progress`
--
ALTER TABLE `course_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_course` (`user_id`,`course_id`);

--
-- 資料表索引 `posts`
--
ALTER TABLE `posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `author_id` (`author_id`);

--
-- 資料表索引 `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- 在傾印的資料表使用自動遞增(AUTO_INCREMENT)
--

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `course_progress`
--
ALTER TABLE `course_progress`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=159;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `posts`
--
ALTER TABLE `posts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- 已傾印資料表的限制式
--

--
-- 資料表的限制式 `course_progress`
--
ALTER TABLE `course_progress`
  ADD CONSTRAINT `course_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- 資料表的限制式 `posts`
--
ALTER TABLE `posts`
  ADD CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
